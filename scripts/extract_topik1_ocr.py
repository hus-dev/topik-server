import subprocess, tempfile, os, pymupdf

def ocr_pdf_to_file(pdf_path, output_path, dpi=160):
    print(f"OCRing {pdf_path} -> {output_path}...")
    doc = pymupdf.open(pdf_path)
    lines = []
    for i, page in enumerate(doc):
        pix = page.get_pixmap(dpi=dpi)
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            pix.save(f.name)
            tmp = f.name
        res = subprocess.run(['./scripts/macos_ocr', tmp], capture_output=True, text=True)
        os.unlink(tmp)
        lines.append(f"--- PAGE {i+1} ---")
        lines.append(res.stdout)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"Saved {output_path} ({len(lines)} chunks)")

os.makedirs('content/topik1-102', exist_ok=True)
os.makedirs('content/topik1-83', exist_ok=True)

ocr_pdf_to_file('topik_data/topik1-102/제102회_문제지_TOPIK1_듣기통합_탑재용.pdf', 'content/topik1-102/listening-ocr.txt')
ocr_pdf_to_file('topik_data/topik1-102/제102회_문제지_TOPIK1_듣기, 읽기_탑재용.pdf', 'content/topik1-102/reading-ocr.txt')

ocr_pdf_to_file('topik_data/topik1-83/83회_문제지_TOPIK1_듣기 통합.pdf', 'content/topik1-83/listening-ocr.txt')
ocr_pdf_to_file('topik_data/topik1-83/83회_문제지_TOPIK1_듣기, 읽기.pdf', 'content/topik1-83/reading-ocr.txt')

print("All OCR extraction complete!")
