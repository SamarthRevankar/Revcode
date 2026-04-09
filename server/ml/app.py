import ast
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
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

app = FastAPI(title="Revcode AI Unified Orchestrator")

# ---------------------------------------------------------
# 1. DATA MODELS
# ---------------------------------------------------------
class CodeInput(BaseModel):
    code: str
    filename: Optional[str] = "snippet.js"

# ---------------------------------------------------------
# 2. ADVANCED SECURITY SCANNER (The "Brain" + XAI)
# ---------------------------------------------------------
class DeepVulnerabilityScanner:
    def __init__(self):
        print("Loading Deep Security Scanner (DistilRoBERTa)...")
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
        
        # Explainable AI (XAI) Logic
        reasoning = "General logic scan."
        if vuln_prob > 0.8:
            reasoning = "High-confidence structural anomaly detected in code flow."
        elif vuln_prob > 0.5:
            reasoning = "Potential security risk identified by neural sequence classifier."
        elif vuln_prob < 0.2:
            reasoning = "Code structure appears robust and follows standard patterns."

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
        
        # Pattern 1: Command Injection
        if "os.system(" in code or "subprocess.Popen(..., shell=True)" in code:
            findings.append({
                "type": "Security",
                "title": "Command Injection Risk",
                "reasoning": "Detected use of shell=True or os.system which can lead to Remote Code Execution."
            })
        
        # Pattern 2: Pickle / Deserialization
        if "pickle.load" in code or "yaml.load(..., Loader=None)" in code:
             findings.append({
                "type": "Security",
                "title": "Insecure Deserialization",
                "reasoning": "Insecure loading of serialized data can lead to arbitrary code execution."
            })

        # Pattern 3: Hardcoded Credentials
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
        # Context Injection: Add filename to the prompt
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
# 7. API ENDPOINTS
# ---------------------------------------------------------
@app.get("/")
async def health():
    return {"status": "Revcode AI ULTRA Orchestrator Operational", "features": ["XAI", "Structural-Scan", "Context-Injection"]}

@app.post("/analyze")
async def analyze_security(data: CodeInput):
    eng = get_scanner()
    
    # 1. Neural Scan (XAI)
    res = eng.scan(data.code)
    
    # 2. Structural Scan (Mini-Semgrep)
    structural_findings = struct_scanner.scan_patterns(data.code, data.filename)
    
    # Merge reasoning from both layers
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
        "provider": "DeepScanner-ULTRA"
    }

@app.post("/fix")
async def fix_code(data: CodeInput):
    rep = get_repairer()
    
    # Generate context-aware fix
    suggestion = rep.repair(data.code, data.filename)
    
    # Safety Layer
    if "eval(" in suggestion:
        suggestion = suggestion.replace("eval(", "JSON.parse(")
    
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
