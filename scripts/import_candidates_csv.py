import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
import re

# Candidate data from CSV
candidates_data = """Juan Baltazar Tapia|College Graduate|juan.baltazartapia@gmail.com
Nikhil Doye|Post-Grad Senior|doye.n@northeastern.edu
Sophie Le|college senior|sophiele7627@gmail.com
Iman Ikram|College Senior|iman.ikram1122@gmail.com
Yaghyesh Ghimire|College Senior|yg2810@nyu.edu
Ivan Vuong|College Junior|ivanvuong05@gmail.com
Channacy Un|College senior|channacyun@gmail.com
Shamar Knibbs|Graduate|shamarknibbs@gmail.com
Sayed Essapour|College Junior|mr.essapour173@gmail.com
Stefano Nebo|alumni|snebo54@hotmail.com
Abdul wahab|College senior|Aawahab1977@gmail.com
Saul Lopez Lucas|College Graduate|saullopezlucas@gmail.com
Kyla Moore|College Junior|soren0820@gmail.com
Ramya Lakshmi Kuppa Sundararajan|Graduate student|ra.kuppasundarar@ufl.edu
Crystal Morell|College Senior|cmorell@liberty.edu
Vedanshi|College sophomore|verma.vedanshiv@gmail.com
Maksatjan Jorayev|College Sophomore|jorayevmaskat1@gmail.com
Minakshi Thapa|Senior|rictas18@gmail.com
Phuong Vu|College junior|phuongvu089@gmail.com
Divakar Babu Kasi|Masters|divakarbabu.kasi@jessup.edu
Anusha Seelam|Bachelors 2009|anushaseelamp@gmail.com
Kajal k|BA Information systems|jeet.kajal@gmail.com
Dylan|College Senior|Nyanamease@gmail.com
Abisa Osei-Amankwah|College Senior|aaosei26@colby.edu
Chisom Arukwe|College senior|chisomarukwe0@gmail.com
Meghana Gundluru|College graduate|meghanag118@gmail.com
Dorisa Shehi|College senior|doris.shehi2@gmail.com
Tahmeed Chowdhury|Graduate Student|tahmeedchowdhury9@gmail.com
Marina Wolters|MS CS AI|marinawr@alumni.upenn.edu
Shreeraam Ramachandran|Graduate|shreeraamr@gmail.com
Anirudh Sayini|Graduate|anirudhsayini@gmail.com
Preeti Rajarathinam|Bachelors graduate|prrajara@ucsc.edu
Dianna Dimambro|New grad|DDIMAMBRO@OUTLOOK.COM
Lashaē Morris|College Freshman|lashaemorris14@gmail.com
Roy Rodriguez|College Sophomore|royrod11564@gmail.com
Ogechukwu Eze|Masters Senior|oceze99@gmail.com
Corine Carrillo|College junior|corinecarrillo1973@gmail.com
Zachary|College freshman|Zmonroe1217@gmail.com
Michelle Sorto|Bachelors degree|Michellesorto123Abc@gmail.com
Jayanth Sankar|Graduate|jayanths@umd.edu
Ellie Roth|College senior|roth.ellie.2004@gmail.com
Rebecca Leung|First Year masters|quarkythings@gmail.com
Taksha Thosani|Masters|taksha.thosani17@gmail.com
Robert Grady Hofeditz|College Freshmen|gh653@georgetown.edu
Kautriaun Singleton|College Senior|kautriaun@theblackertheproduction.com
Marissa Dominguez|Graduate Design|md@marissa.graphics
Rushabh Yenurkar|Masters|rushabhghanshyamyenurkar@my.unt.edu
India Collins|Graduate Student|indialinette@gmail.com
Nestor Gonzalez|Freshmen|nestorjgon1219@gmail.com
Justin Kwok|Class of 2025|justinkwok2002@gmail.com
Mary Boateng|Graduate year 1|Mboate12@gmail.com"""

def parse_candidates():
    candidates = []
    lines = candidates_data.strip().split('\n')
    
    for line in lines[:50]:  # First 50 candidates
        parts = line.split('|')
        if len(parts) >= 3:
            name = parts[0].strip()
            level = parts[1].strip()
            email = parts[2].strip().lower()
            
            # Generate skills based on level
            if 'CS' in level or 'Computer' in level:
                skills = ['Computer Science', 'Programming', 'Software Development']
            elif 'Design' in level or 'UI' in level:
                skills = ['Design', 'UI/UX', 'Creative']
            elif 'Business' in level or 'MBA' in level:
                skills = ['Business', 'Management', 'Strategy']
            elif 'Engineer' in level:
                skills = ['Engineering', 'Problem Solving', 'Technical']
            else:
                skills = ['Communication', 'Teamwork', 'Leadership']
            
            # Determine experience years
            if 'Freshman' in level or 'Sophomore' in level:
                exp_years = 0
            elif 'Junior' in level:
                exp_years = 1
            elif 'Senior' in level:
                exp_years = 2
            elif 'Graduate' in level or 'Masters' in level:
                exp_years = 3
            elif 'Post-Grad' in level or 'PhD' in level:
                exp_years = 5
            else:
                exp_years = 1
            
            # Determine position
            if 'CS' in level or 'Computer' in level:
                position = 'Software Engineer'
            elif 'Design' in level:
                position = 'Product Designer'
            elif 'Business' in level:
                position = 'Business Analyst'
            else:
                position = 'Intern/Entry Level'
            
            candidate = {
                'id': str(uuid.uuid4()),
                'name': name,
                'email': email,
                'skills': skills,
                'experience_years': exp_years,
                'position': position,
                'bio': f'{level} candidate interested in {position} opportunities.',
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            candidates.append(candidate)
    
    return candidates

async def import_candidates():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    candidates = parse_candidates()
    
    print(f"Importing {len(candidates)} candidates...")
    
    result = await db.candidates.insert_many(candidates)
    print(f"Successfully imported {len(result.inserted_ids)} candidates!")
    
    total = await db.candidates.count_documents({})
    print(f"Total candidates in database: {total}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(import_candidates())
