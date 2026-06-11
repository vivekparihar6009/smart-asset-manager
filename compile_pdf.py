import os
import sys
import re
import subprocess

# Auto-install reportlab if missing
try:
    import reportlab
except ImportError:
    print("reportlab library not found. Installing reportlab dynamically...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    import reportlab

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """ Canvas class that performs a two-pass save to calculate and draw page counts """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress headers/footers on title page
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#475569"))
        # Header
        self.drawString(54, 750, "Smart Asset Management Platform - Technical Design Document")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 742, 558, 742)
        # Footer
        self.line(54, 50, 558, 50)
        self.drawString(54, 38, "IIT Roorkee Cultural Council")
        self.drawRightString(558, 38, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def clean_md_text(text):
    """ Converts markdown syntax (*bold*, _italic_) to HTML-like tags for reportlab Paragraph """
    # Replace **bold** with <b>bold</b>
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    # Replace *italic* or _italic_ with <i>italic</i>
    text = re.sub(r'\*(.*?)\*', r'<i>\1</i>', text)
    # Convert any raw & to &amp;
    text = text.replace('&', '&amp;')
    # Clean up inline code `code` to <font face="Courier">code</font>
    text = re.sub(r'`(.*?)`', r'<font face="Courier" color="#1e293b"><b>\1</b></font>', text)
    return text

def parse_markdown(file_path, styles):
    story = []
    
    # Title Cover Page Content
    story.append(Spacer(1, 150))
    story.append(Paragraph("TECHNICAL DESIGN DOCUMENT", styles["DocTitle"]))
    story.append(Spacer(1, 15))
    story.append(Paragraph("Smart Asset Management &amp; Resource Allocation Platform", styles["DocSubtitle"]))
    story.append(Spacer(1, 40))
    story.append(Paragraph("<b>Client:</b> Cultural Council, IIT Roorkee", styles["DocMeta"]))
    story.append(Paragraph("<b>Version:</b> 1.0.0", styles["DocMeta"]))
    story.append(Paragraph("<b>Date:</b> June 2026", styles["DocMeta"]))
    story.append(Paragraph("<b>Status:</b> Approved / Release Candidate", styles["DocMeta"]))
    story.append(PageBreak())
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    in_code_block = False
    code_content = []
    in_table = False
    table_rows = []
    
    i = 0
    while i < len(lines):
        line = lines[i].rstrip('\n')
        
        # Skip top level title as we created a custom cover page
        if line.startswith("# ") and i < 5:
            i += 1
            continue
            
        # Code block tracking
        if line.strip().startswith("```"):
            if in_code_block:
                # End of code block - render it
                raw_code = "\n".join(code_content)
                raw_code = raw_code.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                code_style = ParagraphStyle(
                    'CodeStyle',
                    parent=styles['Normal'],
                    fontName='Courier',
                    fontSize=8.5,
                    leading=11,
                    textColor=colors.HexColor("#0f172a")
                )
                p = Paragraph(f"<pre>{raw_code}</pre>", code_style)
                t = Table([[p]], colWidths=[504])
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
                    ('PADDING', (0,0), (-1,-1), 8),
                ]))
                story.append(t)
                story.append(Spacer(1, 12))
                in_code_block = False
                code_content = []
            else:
                in_code_block = True
            i += 1
            continue
            
        if in_code_block:
            code_content.append(line)
            i += 1
            continue
            
        # Table parsing
        if line.strip().startswith("|") and not in_code_block:
            # Check if this is a separator line (contains only dashes, pipes, spaces, colons)
            if re.match(r'^[\s|:-]+$', line.strip()):
                i += 1
                continue
            
            in_table = True
            cells = [clean_md_text(c.strip()) for c in line.split('|')[1:-1]]
            table_rows.append(cells)
            i += 1
            continue
        elif in_table:
            # End of table - render it
            col_count = len(table_rows[0])
            col_width = 504 / col_count
            
            table_data = []
            # Header Row
            header_style = ParagraphStyle(
                'TableHeader',
                parent=styles['Normal'],
                fontName='Helvetica-Bold',
                fontSize=9,
                leading=12,
                textColor=colors.white
            )
            table_data.append([Paragraph(cell, header_style) for cell in table_rows[0]])
            
            # Body Rows
            body_style = ParagraphStyle(
                'TableBody',
                parent=styles['Normal'],
                fontName='Helvetica',
                fontSize=8,
                leading=11,
                textColor=colors.HexColor("#334155")
            )
            for row in table_rows[1:]:
                table_data.append([Paragraph(cell, body_style) for cell in row])
                
            t = Table(table_data, colWidths=[col_width]*col_count)
            t_style = [
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e3a8a")),
                ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ('BOTTOMPADDING', (0,0), (-1,0), 6),
                ('TOPPADDING', (0,0), (-1,0), 6),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
                ('PADDING', (0,0), (-1,-1), 5),
            ]
            # Add alternating row background colors
            for r_idx in range(1, len(table_rows)):
                bg = colors.HexColor("#f8fafc") if r_idx % 2 == 1 else colors.white
                t_style.append(('BACKGROUND', (0, r_idx), (-1, r_idx), bg))
                
            t.setStyle(TableStyle(t_style))
            story.append(t)
            story.append(Spacer(1, 12))
            in_table = False
            table_rows = []
            
        # Normal Markdown parsing
        stripped = line.strip()
        if not stripped:
            i += 1
            continue
            
        if line.startswith("## "):
            section_title = clean_md_text(line[3:])
            story.append(Spacer(1, 10))
            story.append(Paragraph(section_title, styles["H2"]))
            story.append(Spacer(1, 8))
        elif line.startswith("### "):
            sub_title = clean_md_text(line[4:])
            story.append(Spacer(1, 6))
            story.append(Paragraph(sub_title, styles["H3"]))
            story.append(Spacer(1, 6))
        elif line.startswith("#### "):
            sub_title = clean_md_text(line[5:])
            story.append(Spacer(1, 4))
            story.append(Paragraph(sub_title, styles["H4"]))
            story.append(Spacer(1, 4))
        elif stripped.startswith("* ") or stripped.startswith("- "):
            bullet_text = clean_md_text(stripped[2:])
            bullet_style = ParagraphStyle(
                'BulletItem',
                parent=styles['Normal'],
                leftIndent=15,
                bulletIndent=5,
                spaceAfter=4
            )
            story.append(Paragraph(f"&bull; {bullet_text}", bullet_style))
        elif re.match(r'^\d+\.\s', stripped):
            match = re.match(r'^(\d+)\.\s(.*)', stripped)
            num = match.group(1)
            num_text = clean_md_text(match.group(2))
            num_style = ParagraphStyle(
                'NumItem',
                parent=styles['Normal'],
                leftIndent=15,
                bulletIndent=5,
                spaceAfter=4
            )
            story.append(Paragraph(f"{num}. {num_text}", num_style))
        else:
            para_text = clean_md_text(line)
            story.append(Paragraph(para_text, styles["BodyText"]))
            story.append(Spacer(1, 8))
            
        i += 1
        
    return story

def main():
    doc_path = "DESIGN_DOC.md"
    pdf_path = "DESIGN_DOC.pdf"
    
    if not os.path.exists(doc_path):
        print(f"Error: {doc_path} not found.")
        sys.exit(1)
        
    print(f"Compiling {doc_path} to {pdf_path}...")
    
    # Custom styles
    styles = getSampleStyleSheet()
    
    # Custom Palette styles
    styles.add(ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=colors.HexColor("#1e3a8a"),
        alignment=1 # Center
    ))
    
    styles.add(ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica',
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#475569"),
        alignment=1 # Center
    ))
    
    styles.add(ParagraphStyle(
        'DocMeta',
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        alignment=1
    ))
    
    styles['Normal'].textColor = colors.HexColor("#334155")
    styles['Normal'].fontSize = 10
    styles['Normal'].leading = 14
    
    styles['BodyText'].textColor = colors.HexColor("#334155")
    styles['BodyText'].fontSize = 10
    styles['BodyText'].leading = 14
    
    styles['Heading2'].fontName = 'Helvetica-Bold'
    styles['Heading2'].fontSize = 14
    styles['Heading2'].leading = 18
    styles['Heading2'].textColor = colors.HexColor("#1e3a8a")
    styles['Heading2'].spaceBefore = 12
    styles['Heading2'].keepWithNext = True
    styles.add(ParagraphStyle('H2', parent=styles['Heading2']))
    
    styles['Heading3'].fontName = 'Helvetica-Bold'
    styles['Heading3'].fontSize = 11
    styles['Heading3'].leading = 15
    styles['Heading3'].textColor = colors.HexColor("#2563eb")
    styles['Heading3'].spaceBefore = 10
    styles['Heading3'].keepWithNext = True
    styles.add(ParagraphStyle('H3', parent=styles['Heading3']))
    
    styles['Heading4'].fontName = 'Helvetica-Bold'
    styles['Heading4'].fontSize = 10
    styles['Heading4'].leading = 14
    styles['Heading4'].textColor = colors.HexColor("#475569")
    styles['Heading4'].spaceBefore = 8
    styles['Heading4'].keepWithNext = True
    styles.add(ParagraphStyle('H4', parent=styles['Heading4']))
    
    # Document Build Setup
    # Letter size: 612 x 792 pt. Margins: Left=54, Right=54, Top=72, Bottom=72 (usable width: 504 pt)
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )
    
    story = parse_markdown(doc_path, styles)
    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF compilation completed successfully!")

if __name__ == "__main__":
    main()
