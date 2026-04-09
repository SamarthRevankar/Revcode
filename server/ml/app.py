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

app = FastAPI(title="Revcode AI Precision Engine - Hardened")

# Global State
training_lock = threading.Lock()
is_training = False

class CodeInput(BaseModel):
    code: str
    filename: Optional[str] = "snippet.js"

# ---------------------------------------------------------
# 1. PRECISION SCANNER (Fixed Thresholds)
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
        
        # FIXED: Lowered threshold from 0.85 to 0.50 to catch more threats (per request)
        is_vuln = vuln_prob > 0.50
        
        verdict = "SECURE"
        if vuln_prob > 0.85: verdict = "CRITICAL"
        elif vuln_prob > 0.65: verdict = "WARNING"
        elif vuln_prob > 0.40: verdict = "POTENTIAL"

        return {
            "is_vulnerable": is_vuln,
            "confidence": round(vuln_prob * 100, 2),
            "threat_level": verdict,
            "reasoning": self._generate_reasoning(vuln_prob)
        }

    def _generate_reasoning(self, prob):
        if prob > 0.85: return "CRITICAL: High-confidence signature of exploit pattern detected."
        if prob > 0.5: return "MEDIUM: Structural similarity to known vulnerabilities found."
        return "SAFE: No significant anomalies detected."

# ---------------------------------------------------------
# 2. STRUCTURAL SCANNER (Fixed Logic)
# ---------------------------------------------------------
class StructuralScanner:
    @staticmethod
    def scan(code: str) -> List[dict]:
        findings = []
        
        # Rule 1: Code Injection - Checking for raw eval usage
        # FIXED: Changed from string-match to Regex to find specific dangerous patterns
        if re.search(r"\beval\s*\(", code):
            # Check if it is NOT wrapped in a common safe function
            if not re.search(r"(JSON\.parse|ast\.literal_eval)\s*\(\s*eval\(", code):
                findings.append({
                    "title": "Unsafe Eval Usage",
                    "severity": "CRITICAL",
                    "reasoning": "Detected raw eval() which can execute arbitrary strings as code."
                })

        # Rule 2: Shell Injection
        shell_patterns = [r"os\.system\(", r"subprocess\.Popen\(.*shell\s*=\s*True"]
        for pattern in shell_patterns:
            if re.search(pattern, code):
                findings.append({
                    "title": "Direct Shell Execution",
                    "severity": "HIGH",
                    "reasoning": "Command execution with shell=True is highly susceptible to injection."
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
        
        result = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
        # Post-AI heuristic for safety
        if "eval(" in buggy_code and "eval(" in result:
             result = result.replace("eval(", "JSON.parse(")
        return result

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
    return {"status": "Revcode Precision Engine - Hardened", "is_training": is_training}

@app.post("/analyze")
async def analyze_security(data: CodeInput):
    scanner = get_scanner()
    res = scanner.scan(data.code)
    struct_findings = _struct.scan(data.code)
    
    # Merge Logic
    if struct_findings:
        res["is_vulnerable"] = True
        res["threat_level"] = "CRITICAL"
        res["reasoning"] += " | HARD RULE VIOLATION: " + ", ".join([f['title'] for f in struct_findings])

    return {**res, "structural_findings": struct_findings}

@app.post("/fix")
async def fix_code(data: CodeInput):
    repairer = get_repairer()
    suggestion = repairer.repair(data.code, data.filename)
    return {
        "suggestion": suggestion,
        "engine": "Conservative-CodeT5",
        "context": data.filename
    }

@app.post("/train")
async def trigger_training(background_tasks: BackgroundTasks):
    global is_training
    if is_training: return {"status": "error", "message": "Training already in progress."}
    
    def run():
        global is_training
        is_training = True
        try:
            train_on_devign(output_dir="./trained_model")
            get_scanner(reload=True)
        finally: is_training = False

    background_tasks.add_task(run)
    return {"status": "success", "message": "Training started in background."}

@app.post("/feedback")
async def store_feedback(data: dict):
    # FIXED: Added basic validation so empty feedback doesn't break training
    if "original_code" not in data or "label" not in data:
        raise HTTPException(status_code=400, detail="Missing code or label")
        
    feedback_file = "feedback_dataset.csv"
    df = pd.DataFrame([data])
    df.to_csv(feedback_file, mode='a', header=not os.path.exists(feedback_file), index=False)
    return {"status": "stored"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)