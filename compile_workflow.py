import os
import re
import base64
import requests
import subprocess
from docx import Document
from docx.shared import Inches, Pt

def get_mermaid_image(mermaid_code):
    print("Encoding Mermaid diagram...")
    code_bytes = mermaid_code.encode('utf-8')
    base64_bytes = base64.b64encode(code_bytes)
    base64_string = base64_bytes.decode('utf-8')
    
    url = f"https://mermaid.ink/img/{base64_string}"
    print(f"Fetching rendered diagram from: {url}")
    
    try:
        response = requests.get(url, timeout=15)
        if response.status_code == 200:
            return response.content
        else:
            print(f"Failed to fetch image from mermaid.ink. Status code: {response.status_code}")
            return None
    except Exception as e:
        print(f"Error fetching image: {e}")
        return None

def format_docx(docx_path):
    print(f"Formatting Word document: {docx_path} to optimize space...")
    doc = Document(docx_path)
    
    # 1. Page Margins (0.6 in)
    for section in doc.sections:
        section.top_margin = Inches(0.6)
        section.bottom_margin = Inches(0.6)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)
        
    # 2. Paragraph Spacing, Font Size, and Line Spacing
    for paragraph in doc.paragraphs:
        p_format = paragraph.paragraph_format
        
        # Check if the paragraph style is a Heading
        if paragraph.style.name.startswith('Heading'):
            p_format.space_before = Pt(5)
            p_format.space_after = Pt(2.5)
            p_format.keep_with_next = True
        else:
            p_format.space_before = Pt(1.5)
            p_format.space_after = Pt(1.5)
            p_format.line_spacing = 1.1
            # Apply 10pt font to normal text runs
            for run in paragraph.runs:
                run.font.size = Pt(10)
            
    # 3. Image resizing (Resize data flow diagram to be compact)
    for shape in doc.inline_shapes:
        try:
            original_width = shape.width
            original_height = shape.height
            
            # Set width to 6.2 inches (expanded representation for legibility)
            new_width = Inches(6.2)
            shape.width = new_width
            shape.height = int(original_height * (new_width / original_width))
            print(f"Resized embedded image from {original_width} to {shape.width} EMU.")
        except Exception as shape_err:
            print(f"Could not resize shape: {shape_err}")
            
    doc.save(docx_path)
    print("Formatting complete.")

def main():
    workspace_dir = r"d:\1m1b internship\project"
    md_path = os.path.join(workspace_dir, "SahilAgarwal_AIWorkflow.md")
    plots_dir = os.path.join(workspace_dir, "data", "plots")
    os.makedirs(plots_dir, exist_ok=True)
    img_dest_path = os.path.join(plots_dir, "ai_workflow.png")
    
    if not os.path.exists(md_path):
        print(f"Error: Could not find markdown file at {md_path}")
        return
        
    print(f"Reading {md_path}...")
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Extract mermaid diagram
    mermaid_pattern = re.compile(r'```mermaid\s*\n(.*?)\n```', re.DOTALL)
    match = mermaid_pattern.search(content)
    
    if match:
        mermaid_code = match.group(1).strip()
        print("Found Mermaid diagram code...")
        
        img_data = get_mermaid_image(mermaid_code)
        if img_data:
            with open(img_dest_path, 'wb') as img_f:
                img_f.write(img_data)
            print(f"Successfully saved diagram image to {img_dest_path}")
            
            # Replace the mermaid block with a centered image reference
            rel_img_path = "data/plots/ai_workflow.png"
            processed_content = mermaid_pattern.sub(f"![AI Workflow Diagram]({rel_img_path})", content)
        else:
            print("Failed to download diagram image. Proceeding with original markdown.")
            processed_content = content
    else:
        print("No Mermaid diagram block found.")
        processed_content = content

    # Write processed markdown to a temp file
    temp_md_path = os.path.join(workspace_dir, "SahilAgarwal_AIWorkflow_temp.md")
    with open(temp_md_path, 'w', encoding='utf-8') as f:
        f.write(processed_content)
    
    # Run pandoc to convert MD to DOCX
    docx_path = os.path.join(workspace_dir, "SahilAgarwal_AIWorkflow.docx")
    print(f"Running Pandoc to convert to {docx_path}...")
    try:
        cmd = ["pandoc", temp_md_path, "-o", docx_path]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("Pandoc conversion completed.")
    except Exception as e:
        print(f"Error running Pandoc: {e}")
        if os.path.exists(temp_md_path):
            os.remove(temp_md_path)
        return
        
    if os.path.exists(temp_md_path):
        os.remove(temp_md_path)
        
    # Format DOCX using python-docx to compress layout
    try:
        format_docx(docx_path)
    except Exception as formatting_err:
        print(f"Error while formatting DOCX: {formatting_err}")
        
    # Try converting DOCX to PDF using win32com (MS Word Automation)
    pdf_path = os.path.join(workspace_dir, "SahilAgarwal_AIWorkflow.pdf")
    print(f"Attempting to convert {docx_path} to PDF via MS Word Automation...")
    try:
        import win32com.client
        import pythoncom
        
        # Initialize COM
        pythoncom.CoInitialize()
        
        word = win32com.client.Dispatch("Word.Application")
        word.Visible = False
        
        doc_abs_path = os.path.abspath(docx_path)
        pdf_abs_path = os.path.abspath(pdf_path)
        
        print(f"Opening Word document: {doc_abs_path}")
        doc = word.Documents.Open(doc_abs_path)
        
        print(f"Saving as PDF: {pdf_abs_path}")
        doc.SaveAs(pdf_abs_path, FileFormat=17) # 17 is wdFormatPDF
        
        # Double check statistics before closing
        pages = doc.ComputeStatistics(2)
        print(f"New PDF page count: {pages}")
        
        doc.Close()
        word.Quit()
        print("PDF conversion completed successfully.")
    except Exception as e:
        print(f"Could not convert to PDF using Word Automation: {e}")

if __name__ == "__main__":
    main()
