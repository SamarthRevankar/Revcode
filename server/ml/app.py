import ast
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from transformers import (
    T5ForConditionalGeneration, 
    RobertaTokenizer, 
    AutoModelForSequenceClassification, 
    AutoTokenizer
)
import pandas as pd
import os
import threading
import re

# Import the training function
from train_engine import train_on_devign

app = FastAPI(title="Revcode AI Precision Engine")

# Global State
training_lock = threading.Lock()
is_training = False

class CodeInput(BaseModel):
    code: str
    filename: Optional[str] = "snippet.js"

# ---------------------------------------------------------
# 1. PRECISION SCANNER (CodeBERT-Devign)
# ---------------------------------------------------------
class DeepVulnerabilityScanner:
    def __init__(self):
        # Prefer locally trained model if it exists
        local_model = "./trained_model"
        if os.path.exists(local_model):
            self.model_name = local_model
            self.tokenizer_name = local_model
        else:
            self.model_name = "mahdin70/codebert-devign-code-vulnerability-detector" 
            self.tokenizer_name = "microsoft/codebert-base"
            
        print(f"Loading Precision Scanner ({self.model_name})...")
        self.tokenizer = AutoTokenizer.from_pretrained(self.tokenizer_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
        self.model.eval()
        
    def scan(self, code: str) -> dict:
        inputs = self.tokenizer(code, return_tensors="pt", truncation=True, padding=True, max_length=512)
        with torch.no_grad():
            logits = self.model(**inputs).logits
        
        probs = torch.softmax(logits, dim=1)
        vuln_prob = probs[0][1].item()
        
        # RAISED THRESHOLD: Only flag as 'is_vulnerable' if we are > 85% certain
        is_vuln = vuln_prob > 0.85
        
        verdict = "SECURE"
        if vuln_prob > 0.9: verdict = "CRITICAL"
        elif vuln_prob > 0.7: verdict = "WARNING"
        elif vuln_prob > 0.4: verdict = "POTENTIAL"

        return {
            "is_vulnerable": is_vuln,
            "confidence": round(vuln_prob * 100, 2),
            "threat_level": verdict,
            "reasoning": self._generate_reasoning(vuln_prob, code)
        }

    def _generate_reasoning(self, prob, code):
        if prob > 0.85:
            return "CRITICAL: Detected high-confidence signature of an exploited pattern (likely injection or stack/heap overflow)."
        if prob > 0.5:
            return "MEDIUM: Code structure resembles vulnerable patterns in the security training set. Recommended audit."
        return "SAFE: No significant security anomalies detected by the neural engine."

# ---------------------------------------------------------
# 2. RULE-BASED PATTERN FILTER (Hardened)
# ---------------------------------------------------------
class StructuralScanner:
    @staticmethod
    def scan(code: str, filename: str) -> List[dict]:
        findings = []
        
        # Rule 1: Code Injection (Detecting RAW eval, excluding json/safe wraps)
        if "eval(" in code:
            if not any(x in code for x in ["JSON.parse(", "safe_eval", "ast.literal_eval"]):
                 findings.append({
                    "title": "Unsafe Eval Usage",
                    "severity": "CRITICAL",
                    "reasoning": "Standard eval() executes string data as code. Use JSON.parse() or ast.literal_eval() for data."
                })

        # Rule 2: RAW Command Injection
        if any(x in code for x in ["os.system(", "subprocess.Popen(..., shell=True)"]):
            findings.append({
                "title": "Direct Shell Execution",
                "severity": "HIGH",
                "reasoning": "Detected shell invocation with shell=True. This is highly susceptible to command injection."
            })

        return findings

# ---------------------------------------------------------
# 3. CONSERVATIVE REPAIR ENGINE (Minimal Changes)
# ---------------------------------------------------------
class AutomatedRepairEngine:
    def __init__(self):
        print("Loading Conservative Repair Engine (CodeT5+)...")
        self.model_name = "Salesforce/codet5p-220m" 
        self.tokenizer = RobertaTokenizer.from_pretrained(self.model_name)
        self.model = T5ForConditionalGeneration.from_pretrained(self.model_name)
        self.model.eval()

    def repair(self, buggy_code: str, filename: str) -> str:
        # CONSTRAINED PROMPT: Focus only on the security fix
        prompt = f"Fix the security scan vulnerability in this {filename} file accurately and with minimal changes: {buggy_code}"
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_length=512,
                num_beams=5,
                temperature=0.2, # LOWER TEMPERATURE for less creativity/more precision
                early_stopping=True
            )
        
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

# ---------------------------------------------------------
# 4. ORCHESTRATION & API
# ---------------------------------------------------------
_scanner = None
_repairer = None
_struct = StructuralScanner()

def get_scanner(reload=False):
    global _scanner
    if _scanner is None or reload: _scanner = DeepVulnerabilityScanner()
    return _scanner

def get_repairer():
    global _repairer
    if _repairer is None: _repairer = AutomatedRepairEngine()
    return _repairer

@app.get("/")
async def health():
    return {"status": "Revcode Precision Engine Live", "is_training": is_training}

@app.post("/analyze")
async def analyze_security(data: CodeInput):
    scanner = get_scanner()
    
    # 1. Neural Analysis
    res = scanner.scan(data.code)
    
    # 2. Structural Analysis
    struct_findings = _struct.scan(data.code, data.filename)
    
    # Merge Logic: If structural findings exist, it's definitely vulnerable
    if struct_findings:
        res["is_vulnerable"] = True
        res["threat_level"] = "CRITICAL"
        res["reasoning"] += " | Found hard rules violation: " + ", ".join([f['title'] for f in struct_findings])

    return {
        "is_vulnerable": res["is_vulnerable"],
        "confidence": res["confidence"],
        "threat_level": res["threat_level"],
        "reasoning": res["reasoning"],
        "structural_findings": struct_findings,
        "is_training": is_training
    }

@app.post("/fix")
async def fix_code(data: CodeInput):
    repairer = get_repairer()
    
    # 1. Primary generative fix
    suggestion = repairer.repair(data.code, data.filename)
    
    # 2. Post-processing: If the AI failed to replace eval, force a surgical replacement
    # This prevents the "vulnerability still there" issue
    if "eval(" in data.code and "eval(" in suggestion:
        suggestion = suggestion.replace("eval(", "JSON.parse(")
        
    return {
        "suggestion": suggestion,
        "engine": "Conservative-CodeT5",
        "context": data.filename
    }

@app.post("/train")
async def trigger_training(background_tasks: BackgroundTasks):
    global is_training
    if is_training: return {"status": "error", "message": "Training in progress"}
    
    def run():
        global is_training
        is_training = True
        try:
            train_on_devign(output_dir="./trained_model")
            get_scanner(reload=True)
        finally: is_training = False

    background_tasks.add_task(run)
    return {"status": "success", "message": "Training started"}

@app.post("/feedback")
async def store_feedback(data: dict):
    feedback_file = "feedback_dataset.csv"
    pd.DataFrame([data]).to_csv(feedback_file, mode='a', header=not os.path.exists(feedback_file), index=False)
    return {"status": "stored"}