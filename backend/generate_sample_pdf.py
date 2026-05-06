import os

try:
    from fpdf import FPDF
except ImportError:
    import subprocess
    import sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf2"])
    from fpdf import FPDF

pdf = FPDF()
pdf.add_page()
pdf.set_font("Helvetica", size=12)

text = """
IN THE HIGH COURT OF DELHI AT NEW DELHI

WRIT PETITION (CIVIL) NO. 1247 OF 2024

Date of Order: 15th March 2024

IN THE MATTER OF:
Rajesh Kumar Sharma                    ...Petitioner
vs.
Union of India & Ors.                  ...Respondents

CORAM: THE HON'BLE MR. JUSTICE ANIL KUMAR MEHTA

SUBJECT: Non-implementation of Right to Information Act provisions

ORDER

This writ petition has been filed challenging the inaction of the 
respondents in processing RTI applications filed by the petitioner 
on 01st January 2024 and 15th January 2024.

After hearing both the parties, this Court is of the view that the 
respondents have failed to comply with the mandatory timelines 
prescribed under the Right to Information Act, 2005.

Accordingly, the following directions are issued:

1. The Central Public Information Officer (CPIO) of the Ministry of 
   Home Affairs shall provide complete information sought by the 
   petitioner within 30 days from the date of this order.

2. The Ministry of Home Affairs is directed to conduct an internal 
   inquiry into the delay and submit a compliance report to this Court 
   within 45 days.

3. The Department of Personnel and Training (DoPT) shall issue fresh 
   guidelines to all Ministries regarding timely disposal of RTI 
   applications within 60 days.

4. A penalty of Rs. 25,000/- is imposed on the defaulting CPIO for 
   willful non-compliance, payable within 15 days.

Timeline: Compliance report to be filed before this Court by 30th April 2024.

Next date of hearing: 5th May 2024

Respondents are put to notice. Non-compliance may result in contempt 
proceedings.

Sd/-
JUSTICE ANIL KUMAR MEHTA
HIGH COURT OF DELHI
Dated: 15th March 2024
"""

for line in text.split('\n'):
    pdf.cell(200, 10, txt=line, ln=1, align='L')

output_path = os.path.join(os.path.dirname(__file__), "sample_judgment.pdf")
pdf.output(output_path)
print(f"Sample PDF created at: {output_path}")
