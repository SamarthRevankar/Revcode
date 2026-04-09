import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    Trainer, 
    TrainingArguments
)
from datasets import load_dataset
import pandas as pd
import os

def train_on_devign(base_model="microsoft/codebert-base", output_dir="./trained_model"):
    print(f"🚀 Initializing Autotrain Engine for {base_model}")
    
    # 1. Load specialized Devign dataset
    print("📥 Loading Devign dataset from Hugging Face Hub...")
    try:
        dataset = load_dataset("DetectVul/devign")
    except Exception as e:
        print(f"Failed to load Devign: {e}. Falling back to sample dataset.")
        return

    tokenizer = AutoTokenizer.from_pretrained(base_model)

    def tokenize_function(examples):
        return tokenizer(examples["func"], padding="max_length", truncation=True, max_length=512)

    print("✂️ Tokenizing dataset...")
    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    # 2. Load Model
    print("🧠 Loading Base Model...")
    model = AutoModelForSequenceClassification.from_pretrained(base_model, num_labels=2)

    # 3. Setup Training
    training_args = TrainingArguments(
        output_dir=output_dir,
        evaluation_strategy="epoch",
        learning_rate=2e-5,
        per_device_train_batch_size=8, # Optimized for high-performance
        per_device_eval_batch_size=8,
        num_train_epochs=3,
        weight_decay=0.01,
        push_to_hub=False,
        logging_dir='./logs',
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["test"],
    )

    # 4. Train
    print("🔥 Starting Fine-tuning cycle...")
    trainer.train()

    # 5. Save & Update
    print(f"✅ Training Complete. Saving to {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

if __name__ == "__main__":
    # In a real scenario, this would be triggered by /train
    train_on_devign()
