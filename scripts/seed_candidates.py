import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

async def seed_candidates():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    
    # Check if candidates already exist
    existing = await db.candidates.count_documents({})
    if existing > 0:
        print(f"Database already has {existing} candidates")
        return
    
    candidates = [
        {
            "id": str(uuid.uuid4()),
            "name": "Sarah Johnson",
            "email": "sarah.johnson@example.com",
            "skills": ["Python", "React", "Node.js", "MongoDB", "AWS"],
            "experience_years": 5,
            "position": "Full Stack Developer",
            "bio": "Experienced full-stack developer with a passion for building scalable web applications. Strong background in both frontend and backend technologies.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Michael Chen",
            "email": "michael.chen@example.com",
            "skills": ["JavaScript", "TypeScript", "React", "Vue.js", "CSS"],
            "experience_years": 4,
            "position": "Frontend Developer",
            "bio": "Creative frontend developer focused on creating beautiful, responsive user interfaces. Expert in modern JavaScript frameworks and design systems.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Emily Rodriguez",
            "email": "emily.rodriguez@example.com",
            "skills": ["Python", "Django", "FastAPI", "PostgreSQL", "Docker"],
            "experience_years": 6,
            "position": "Backend Developer",
            "bio": "Senior backend engineer with extensive experience in API design and microservices architecture. Passionate about clean code and system optimization.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "David Kim",
            "email": "david.kim@example.com",
            "skills": ["Java", "Spring Boot", "Kubernetes", "CI/CD", "Jenkins"],
            "experience_years": 7,
            "position": "DevOps Engineer",
            "bio": "DevOps specialist with deep knowledge of cloud infrastructure and automation. Experienced in building robust deployment pipelines and monitoring systems.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Jessica Martinez",
            "email": "jessica.martinez@example.com",
            "skills": ["React Native", "Swift", "Kotlin", "Firebase", "REST API"],
            "experience_years": 4,
            "position": "Mobile Developer",
            "bio": "Mobile developer specializing in cross-platform applications. Strong focus on performance optimization and user experience design.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Robert Taylor",
            "email": "robert.taylor@example.com",
            "skills": ["Machine Learning", "Python", "TensorFlow", "PyTorch", "Data Science"],
            "experience_years": 5,
            "position": "ML Engineer",
            "bio": "Machine learning engineer with experience in building and deploying AI models. Passionate about solving complex problems with data-driven solutions.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Amanda Lee",
            "email": "amanda.lee@example.com",
            "skills": ["UI/UX Design", "Figma", "Adobe XD", "Prototyping", "User Research"],
            "experience_years": 3,
            "position": "Product Designer",
            "bio": "Creative product designer with a user-centered approach. Skilled in creating intuitive interfaces and conducting user research to inform design decisions.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "James Wilson",
            "email": "james.wilson@example.com",
            "skills": ["React", "Next.js", "GraphQL", "TypeScript", "Tailwind CSS"],
            "experience_years": 4,
            "position": "Frontend Engineer",
            "bio": "Modern frontend engineer focused on building performant web applications. Expert in React ecosystem and modern CSS frameworks.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    result = await db.candidates.insert_many(candidates)
    print(f"Successfully seeded {len(result.inserted_ids)} candidates!")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_candidates())
