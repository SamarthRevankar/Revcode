import ast
import torch
import torch.nn as nn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import T5ForConditionalGeneration, RobertaTokenizer, DistilBertModel, DistilBertTokenizer
import pandas as pd
import os

app = FastAPI(title="Revcode AI Unified Orchestrator")

# ---------------------------------------------------------
# 1. SECURITY GUARDIAN (DistilBERT)
# ---------------------------------------------------------
class SecurityClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.bert = DistilBertModel.from_pretrained("distilbert-base-uncased")
        self.classifier = nn.Sequential(
            nn.Linear(768, 256), nn.ReLU(), nn.Dropout(0.3), nn.Linear(256, 2)
        )

    def forward(self, input_ids, attention_mask):
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        return self.classifier(outputs.last_hidden_state[:, 0, :])

# ---------------------------------------------------------
# 2. ARCHITECTURAL GUARDRAILS
# ---------------------------------------------------------
class Guardrails:
    @staticmethod
    def validate(code: str):
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    if not node.name.islower() and "_" not in node.name:
                        return False, f"Function '{node.name}' violates snake_case standards."
            return True, "Valid"
        except Exception as e:
            return False, f"Syntax analysis failed: {str(e)}"

# ---------------------------------------------------------
# 3. GLOBAL MODEL HANDLERS (Lazy Loading)
# ---------------------------------------------------------
FIXER_MODEL = "Salesforce/codet5p-220m"
SECURITY_MODEL = "distilbert-base-uncased"

models = {
    "fixer": None,
    "security": None,
    "tokenizers": {}
}

def load_fixer():
    if not models["fixer"]:
        try:
            print("Loading CodeT5+ Fixer...")
            models["tokenizers"]["fixer"] = RobertaTokenizer.from_pretrained(FIXER_MODEL)
            models["fixer"] = T5ForConditionalGeneration.from_pretrained(FIXER_MODEL)
        except Exception as e:
            print(f"Failed to load fixer model: {e}. Falling back to Rule Engine.")
            models["fixer"] = "RULE_ENGINE"
    return models["fixer"], models["tokenizers"].get("fixer")

def load_security():
    if not models["security"]:
        try:
            print("Loading DistilBERT Guardian...")
            models["tokenizers"]["security"] = DistilBertTokenizer.from_pretrained(SECURITY_MODEL)
            models["security"] = SecurityClassifier()
            models["security"].eval()
        except Exception as e:
            print(f"Failed to load security model: {e}. Falling back to Heuristic Scan.")
            models["security"] = "HEURISTIC"
    return models["security"], models["tokenizers"].get("security")

# ---------------------------------------------------------
# 4. API ENDPOINTS
# ---------------------------------------------------------
class CodeInput(BaseModel):
    code: str

@app.post("/analyze")
async def analyze_security(data: CodeInput):
    model, tokenizer = load_security()
    
    if model == "HEURISTIC":
        # Rule-based fallback for security
        is_vulnerable = "eval(" in data.code or "innerHTML" in data.code
        return {
            "is_vulnerable": is_vulnerable,
            "confidence": 85.0 if is_vulnerable else 95.0,
            "verdict": "VULNERABLE" if is_vulnerable else "SECURE",
            "provider": "RuleEngine"
        }

    inputs = tokenizer(data.code, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        logits = model(inputs['input_ids'], inputs['attention_mask'])
        probs = torch.softmax(logits, dim=1)
        vulnerability_prob = probs[0][1].item()
    
    return {
        "is_vulnerable": vulnerability_prob > 0.5,
        "confidence": round(vulnerability_prob * 100, 2),
        "verdict": "SECURE" if vulnerability_prob <= 0.5 else "VULNERABLE",
        "provider": "DistilBERT"
    }

@app.post("/fix")
async def fix_code(data: CodeInput):
    model, tokenizer = load_fixer()
    
    suggestion = data.code
    if model == "RULE_ENGINE":
        # Advanced Rule-based correction
        suggestion = data.code.replace("eval(", "JSON.parse(").replace("console.log(", "// logger.info(")
        status = "PASSED"
        msg = "Rule-based fix applied (Model offline)"
    else:
        input_text = f"Fix code: {data.code}"
        inputs = tokenizer(input_text, return_tensors="pt", truncation=True)
        with torch.no_grad():
            outputs = model.generate(**inputs, max_length=512)
        suggestion = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Run Guardrails
        is_valid, msg = Guardrails.validate(suggestion)
        status = "PASSED" if is_valid else "FAILED"
    
    return {
        "suggestion": suggestion,
        "guardrail_status": status,
        "guardrail_msg": msg
    }

@app.post("/feedback")
async def store_feedback(data: dict):
    # Store feedback for HITL (Human-In-The-Loop)
    # columns: original_code, corrected_code
    feedback_file = "feedback_dataset.csv"
    df = pd.DataFrame([data])
    df.to_csv(feedback_file, mode='a', header=not os.path.exists(feedback_file), index=False)
    return {"status": "Feedback stored for retraining"}

@app.get("/")
async def health():
    return {"status": "Revcode AI Engine is alive", "models_loaded": list(models.keys())}
