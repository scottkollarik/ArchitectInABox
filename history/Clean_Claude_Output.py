# Clean_Claude_Output.py
import sys

def process_chunk(input_path, output_path, context):
    try:
        with open(input_path, "r") as infile, open(output_path, "w") as outfile:
            for line in infile:
                # Skip lines matching these patterns
                if line.startswith(("📊 Tokens", "Restore checkpoint", "Show [X] more lines", 
                                   "🔄 ", "⏳ ", "💭 Thinking...")):
                    continue
                # Skip blank lines
                if line.strip() == "":
                    continue
            # Replace specific patterns
                if line.startswith("🤖 "):
                    outfile.write("[CB]\n")
                elif line.startswith("👤 You"):
                    outfile.write("[U]\n")
                elif line.startswith("💭 Thinking..."):
                    outfile.write("[CBT]\n")
                else:
                    outfile.write(line)
        print(f"✅ Processed chunk: {input_path} → {output_path}")
        return context + "\n" + line  # Update context with the latest line
    except Exception as e:
        print(f"❌ Error: {e}")
        return context

if __name__ == "__main__":
    # Process all chunks sequentially
    chunks = [f"processed_chunk_{i}" for i in range(1, 100)]  # Adjust based on actual chunk count
    context = ""
    for chunk in chunks:
        input_file = chunk
        output_file = f"cleaned_chunk_{chunk.split('_')[-1]}.txt"
        context = process_chunk(input_file, output_file, context)
