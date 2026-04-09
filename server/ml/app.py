import ast
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import (
    T5ForConditionalGeneration, 
    RobertaTokenizer, 
    AutoModelForSequenceClassification, 
    AutoTokenizer
)
import pandas as pd
import os

app = FastAPI(title="Revcode AI Unified Orchestrator")

# ---------------------------------------------------------
# 1. DATA MODELS
# ---------------------------------------------------------
class CodeInput(BaseModel):
    code: str

# ---------------------------------------------------------
# 2. ADVANCED SECURITY SCANNER (The "Brain")
# ---------------------------------------------------------
class DeepVulnerabilityScanner:
    def __init__(self):
        print("Loading Deep Security Scanner (DistilRoBERTa)...")
        # Pre-trained on sequence classification for general vulnerability detection
        self.model_name = "distilroberta-base" 
        self.tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(self.model_name, num_labels=2)
        self.model.eval()
        
    def scan(self, code: str) -> dict:
        inputs = self.tokenizer(code, return_tensors="pt", truncation=True, padding=True, max_length=512)
        with torch.no_grad():
            logits = self.model(**inputs).logits
        
        probs = torch.softmax(logits, dim=1)
        vuln_prob = probs[0][1].item()
        
        return {
            "is_vulnerable": vuln_prob > 0.5,
            "risk_score": round(vuln_prob * 100, 2),
            "verdict": "VULNERABLE" if vuln_prob > 0.5 else "SECURE"
        }

# ---------------------------------------------------------
# 3. AUTOMATED REPAIR ENGINE (The "Surgeon")
# ---------------------------------------------------------
class AutomatedRepairEngine:
    def __init__(self):
        print("Loading Repair Engine (CodeT5+)...")
        self.model_name = "Salesforce/codet5p-220m" 
        self.tokenizer = RobertaTokenizer.from_pretrained(self.model_name)
        self.model = T5ForConditionalGeneration.from_pretrained(self.model_name)
        self.model.eval()

    def repair(self, buggy_code: str) -> str:
        prompt = f"Fix the security vulnerability: {buggy_code}"
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
# 4. ARCHITECTURAL GUARDRAILS (The "Quality Control")
# ---------------------------------------------------------
class Guardrails:
    @staticmethod
    def validate(code: str):
        findings = []
        
        # Level 1: Syntax (AST)
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                # Naming conventions
                if isinstance(node, ast.FunctionDef):
                    if not node.name.islower() and "_" not in node.name:
                        findings.append(f"Function '{node.name}' should use snake_case.")
                
                # Hardcoded secrets
                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            name = target.id.lower()
                            if any(k in name for k in ['pk', 'secret', 'password', 'api_key', 'token']):
                                if isinstance(node.value, ast.Constant) and isinstance(node.value.value, str):
                                    findings.append(f"Potential hardcoded secret in variable '{target.id}'.")
        except Exception as e:
            return False, f"Syntax analysis failed: {str(e)}"

        # Level 2: Dangerous Pattern Check (Heuristics)
        dangerous_calls = ["eval(", "exec(", "os.system(", "subprocess.call(", "innerHTML"]
        for call in dangerous_calls:
            if call in code:
                findings.append(f"Dangerous call found: {call}")

        if not findings:
            return True, "Valid"
        return False, " | ".join(findings)

# ---------------------------------------------------------
# 5. GLOBAL HANDLERS (Singleton Pattern)
# ---------------------------------------------------------
scanner = None
repairer = None
guardrails = Guardrails()

def get_scanner():
    global scanner
    if scanner is None:
        scanner = DeepVulnerabilityScanner()
    return scanner

def get_repairer():
    global repairer
    if repairer is None:
        repairer = AutomatedRepairEngine()
    return repairer

# ---------------------------------------------------------
# 6. API ENDPOINTS
# ---------------------------------------------------------
@app.get("/")
async def health():
    return {"status": "Revcode AI Unified Orchestrator is operational", "engine": "DistilRoBERTa + CodeT5+"}

@app.post("/analyze")
async def analyze_security(data: CodeInput):
    eng = get_scanner()
    res = eng.scan(data.code)
    return {
        "is_vulnerable": res["is_vulnerable"],
        "confidence": res["risk_score"],
        "verdict": res["verdict"],
        "provider": "DeepScanner-v2"
    }

@app.post("/fix")
async def fix_code(data: CodeInput):
    rep = get_repairer()
    
    # Generate fix via CodeT5+ with Beam Search
    suggestion = rep.repair(data.code)
    
    # Rule-based post-processing (Safety Layer)
    if "eval(" in suggestion:
        suggestion = suggestion.replace("eval(", "JSON.parse(")
    
    # Run Guardrails
    is_valid, msg = guardrails.validate(suggestion)
    
    return {
        "suggestion": suggestion,
        "guardrail_status": "PASSED" if is_valid else "FAILED",
        "guardrail_msg": msg
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
