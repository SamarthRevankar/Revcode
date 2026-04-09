import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification, 
    Trainer, 
    TrainingArguments
)
from datasets import load_dataset, Dataset
import pandas as pd
import os

def train_on_devign(base_model="microsoft/codebert-base", output_dir="./trained_model"):
    print(f"🚀 Initializing Autotrain Engine (Precision v2) for {base_model}")
    
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"💻 Using hardware: {device}")

    # 1. Load specialized Devign dataset
    print("📥 Loading Devign dataset from Hugging Face Hub...")
    try:
        remote_data = load_dataset("DetectVul/devign", split="train[:5000]") # Limit to 5k for speed
    except Exception as e:
        print(f"Failed to load Devign: {e}. Falling back to sample dataset.")
        return

    # 2. Integrate Local Feedback Data (Active Learning)
    feedback_file = "feedback_dataset.csv"
    if os.path.exists(feedback_file):
        print("📈 Merging local feedback data into training set...")
        fb_df = pd.read_csv(feedback_file)
        # Assuming CSV has 'original_code' and we treat applied fixes as 'Safe' (Label 0) or similar
        # For simplicity, we just add the code and label it
        fb_data = Dataset.from_pandas(fb_df.rename(columns={'original_code': 'func'}))
        # Add labels if missing
        if 'label' not in fb_data.column_names:
            fb_data = fb_data.add_column("label", [1] * len(fb_data)) # Treat feedback items as vulnerable patterns we should recognize
        
        # Merge remote and local
        from datasets import concatenate_datasets
        dataset = concatenate_datasets([remote_data, fb_data])
    else:
        dataset = remote_data

    tokenizer = AutoTokenizer.from_pretrained(base_model)

    def tokenize_function(examples):
        return tokenizer(examples["func"], padding="max_length", truncation=True, max_length=512)

    print("✂️ Tokenizing hybrid dataset...")
    tokenized_datasets = dataset.map(tokenize_function, batched=True)

    # 3. Load Model
    print("🧠 Loading Base Model...")
    model = AutoModelForSequenceClassification.from_pretrained(base_model, num_labels=2).to(device)

    # 4. Setup Training
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=3,
        per_device_train_batch_size=4, # Reduced for stability on wider range of hardware
        learning_rate=2e-5,
        weight_decay=0.01,
        logging_dir='./logs',
        save_strategy="no",
        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets,
    )

    # 5. Train
    print("🔥 Starting active learning cycle...")
    trainer.train()

    # 6. Save results
    print(f"✅ Training Complete. Saving weights to {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

if __name__ == "__main__":
    train_on_devign()
