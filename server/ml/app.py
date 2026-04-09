import ast
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from transformers import (
    T5ForConditionalGeneration, 
    RobertaTokenizer, 
    AutoModelForSequenceClassification, 
    AutoTokenizer
)
import pandas as pd
import os
import threading

# Import the training function
from train_engine import train_on_devign

app = FastAPI(title="Revcode AI ULTRA Orchestrator")

# Global training status
training_lock = threading.Lock()
is_training = False

# ---------------------------------------------------------
# 1. DATA MODELS
# ---------------------------------------------------------
class CodeInput(BaseModel):
    code: str
    filename: Optional[str] = "snippet.js"

# ---------------------------------------------------------
# 2. ADVANCED SECURITY SCANNER (CodeBERT-Devign + XAI)
# ---------------------------------------------------------
class DeepVulnerabilityScanner:
    def __init__(self):
        # We check if a locally trained model exists, otherwise use the base
        local_model = "./trained_model"
        if os.path.exists(local_model):
            self.model_name = local_model
            self.tokenizer_name = local_model
            print(f"Loading Locally Trained Security Scanner ({self.model_name})...")
        else:
            self.model_name = "mahdin70/codebert-devign-code-vulnerability-detector" 
            self.tokenizer_name = "microsoft/codebert-base"
            print(f"Loading SOTA Security Scanner ({self.model_name})...")
            
        self.tokenizer = AutoTokenizer.from_pretrained(self.tokenizer_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name)
        self.model.eval()
        
    def scan(self, code: str) -> dict:
        inputs = self.tokenizer(code, return_tensors="pt", truncation=True, padding=True, max_length=512)
        with torch.no_grad():
            logits = self.model(**inputs).logits
        
        probs = torch.softmax(logits, dim=1)
        vuln_prob = probs[0][1].item()
        
        reasoning = "Analyzing code logic for Devign-pattern vulnerabilities."
        if vuln_prob > 0.9:
            reasoning = "CRITICAL: High-confidence fingerprint of a known vulnerability pattern (e.g., Buffer Overflow, Improper Sanitization)."
        elif vuln_prob > 0.5:
            reasoning = "WARNING: Code semantics mirror dangerous patterns found in the Devign security dataset."
        elif vuln_prob < 0.1:
            reasoning = "SAFE: Code logic is clean of any recognized vulnerability fingerprints."

        return {
            "is_vulnerable": vuln_prob > 0.5,
            "risk_score": round(vuln_prob * 100, 2),
            "verdict": "VULNERABLE" if vuln_prob > 0.5 else "SECURE",
            "reasoning": reasoning
        }

# ---------------------------------------------------------
# 3. STRUCTURAL SCANNER (Mini-Semgrep)
# ---------------------------------------------------------
class StructuralScanner:
    @staticmethod
    def scan_patterns(code: str, filename: str) -> list:
        findings = []
        if "os.system(" in code or "subprocess.Popen(..., shell=True)" in code:
            findings.append({
                "type": "Security",
                "title": "Command Injection Risk",
                "reasoning": "Detected use of shell=True or os.system which can lead to Remote Code Execution."
            })
        if "pickle.load" in code or "yaml.load(..., Loader=None)" in code:
             findings.append({
                "type": "Security",
                "title": "Insecure Deserialization",
                "reasoning": "Insecure loading of serialized data can lead to arbitrary code execution."
            })
        if "Password =" in code or "API_KEY =" in code:
            findings.append({
                "type": "Compliance",
                "title": "Hardcoded Secret",
                "reasoning": "Sensitive credentials found in source code. Use environment variables instead."
            })
        return findings

# ---------------------------------------------------------
# 4. AUTOMATED REPAIR ENGINE (The "Surgeon" + Context)
# ---------------------------------------------------------
class AutomatedRepairEngine:
    def __init__(self):
        print("Loading Repair Engine (CodeT5+)...")
        self.model_name = "Salesforce/codet5p-220m" 
        self.tokenizer = RobertaTokenizer.from_pretrained(self.model_name)
        self.model = T5ForConditionalGeneration.from_pretrained(self.model_name)
        self.model.eval()

    def repair(self, buggy_code: str, filename: str) -> str:
        prompt = f"Fix the security vulnerability in this {filename} file: {buggy_code}"
        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=512)
        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_length=512,
                num_beams=5,
                temperature=0.7,
                early_stopping=True
            )
        return self.tokenizer.decode(outputs[0], skip_special_tokens=True)

# ---------------------------------------------------------
# 5. ARCHITECTURAL GUARDRAILS
# ---------------------------------------------------------
class Guardrails:
    @staticmethod
    def validate(code: str):
        try:
            ast.parse(code)
            return True, "Valid"
        except Exception as e:
            return False, f"Syntax analysis failed: {str(e)}"

# ---------------------------------------------------------
# 6. GLOBAL HANDLERS
# ---------------------------------------------------------
scanner = None
repairer = None
struct_scanner = StructuralScanner()
guardrails = Guardrails()

def get_scanner(force_reload=False):
    global scanner
    if scanner is None or force_reload:
        scanner = DeepVulnerabilityScanner()
    return scanner

def get_repairer():
    global repairer
    if repairer is None:
        repairer = AutomatedRepairEngine()
    return repairer

# ---------------------------------------------------------
# 7. TRAINING WRAPPER
# ---------------------------------------------------------
def run_training():
    global is_training
    with training_lock:
        is_training = True
    try:
        print("--- STARTING BACKGROUND TRAINING CYCLE ---")
        train_on_devign(output_dir="./trained_model")
        print("--- TRAINING CYCLE COMPLETED. RELOADING SCANNER ---")
        get_scanner(force_reload=True)
    finally:
        with training_lock:
            is_training = False

# ---------------------------------------------------------
# 8. API ENDPOINTS
# ---------------------------------------------------------
@app.get("/")
async def health():
    return {
        "status": "Revcode AI ULTRA Orchestrator Operational", 
        "is_training": is_training,
        "features": ["XAI", "Structural-Scan", "Context-Injection", "Auto-Train"]
    }

@app.post("/train")
async def trigger_training(background_tasks: BackgroundTasks):
    global is_training
    if is_training:
        return {"status": "error", "message": "Training already in progress."}
    
    background_tasks.add_task(run_training)
    return {"status": "success", "message": "Training started in background."}

@app.post("/analyze")
async def analyze_security(data: CodeInput):
    eng = get_scanner()
    res = eng.scan(data.code)
    structural_findings = struct_scanner.scan_patterns(data.code, data.filename)
    if structural_findings:
        res["is_vulnerable"] = True
        res["reasoning"] += " | Structural rules flagged: " + ", ".join([f['title'] for f in structural_findings])
        res["verdict"] = "CRITICAL_VULNERABILITY"

    return {
        "is_vulnerable": res["is_vulnerable"],
        "confidence": res["risk_score"],
        "verdict": res["verdict"],
        "reasoning": res["reasoning"],
        "structural_findings": structural_findings,
        "is_training": is_training,
        "provider": "DeepScanner-ULTRA"
    }

@app.post("/fix")
async def fix_code(data: CodeInput):
    rep = get_repairer()
    suggestion = rep.repair(data.code, data.filename)
    is_valid, msg = guardrails.validate(suggestion)
    return {
        "suggestion": suggestion,
        "guardrail_status": "PASSED" if is_valid else "FAILED",
        "guardrail_msg": msg,
        "context_applied": data.filename
    }

@app.post("/verify")
async def verify_fix(data: CodeInput):
    is_valid, msg = guardrails.validate(data.code)
    return {
        "is_valid": is_valid,
        "message": msg,
        "status": "PASSED" if is_valid else "WARNING"
    }

@app.post("/feedback")
async def store_feedback(data: dict):
    feedback_file = "feedback_dataset.csv"
    df = pd.DataFrame([data])
    df.to_csv(feedback_file, mode='a', header=not os.path.exists(feedback_file), index=False)
    return {"status": "Feedback stored for retraining"}
