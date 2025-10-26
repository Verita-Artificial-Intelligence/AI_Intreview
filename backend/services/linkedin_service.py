"""LinkedIn profile scraping service using Apify."""

import httpx
from typing import Optional, Dict, Any, List
from config import settings


async def scrape_linkedin_profile(linkedin_url: str) -> Optional[Dict[str, Any]]:
    """
    Scrape LinkedIn profile data using Apify actor.

    Args:
        linkedin_url: The LinkedIn profile URL to scrape

    Returns:
        Parsed profile data with relevant fields, or None if scraping fails
    """
    if not settings.APIFY_API_KEY:
        raise ValueError("APIFY_API_KEY is not configured")

    # Apify actor endpoint with additional parameters
    # Adding timeout and memory parameters to ensure the actor has enough resources
    actor_url = f"https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/run-sync-get-dataset-items?token={settings.APIFY_API_KEY}&timeout=300&memory=2048"

    # Request payload - actor expects profileUrls as per API error message
    # Adding configuration that LinkedIn scrapers typically need
    payload = {
        "profileUrls": [linkedin_url],
        "proxyConfiguration": {
            "useApifyProxy": True,
            "apifyProxyGroups": ["RESIDENTIAL"],
        },
    }

    print(f"Scraping LinkedIn profile: {linkedin_url}")
    print(f"Payload: {payload}")

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                actor_url, json=payload, headers={"Content-Type": "application/json"}
            )

            print(f"Apify Response Status: {response.status_code}")

            # Accept both 200 and 201 as success status codes
            if response.status_code not in [200, 201]:
                print(f"Apify API Error - Status: {response.status_code}")
                print(f"Response body: {response.text}")
                response.raise_for_status()

            data = response.json()

            print(f"Apify returned data: {len(data) if data else 0} profiles")
            print(f"Raw response preview: {str(data)[:500]}")

            # The response is an array, take the first item
            if not data or len(data) == 0:
                print("Apify returned empty data - this could be due to:")
                print("  - LinkedIn's anti-scraping measures blocking the request")
                print("  - The profile URL being invalid or private")
                print("  - The actor needing additional configuration")
                print(f"  - URL provided: {linkedin_url}")
                return None

            profile = data[0]
            print(f"Profile scraped successfully: {profile.get('fullName', 'Unknown')}")

            # Parse and return relevant data
            parsed_data = parse_linkedin_data(profile)
            print(
                f"Parsed data: firstName={parsed_data.get('firstName')}, lastName={parsed_data.get('lastName')}, expertise count={len(parsed_data.get('expertise', []))}"
            )

            return parsed_data

    except httpx.HTTPError as e:
        print(f"HTTP error occurred while scraping LinkedIn: {e}")
        return None
    except Exception as e:
        print(f"Error scraping LinkedIn profile: {e}")
        return None


def parse_linkedin_data(profile: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse LinkedIn profile data into format suitable for candidate profile.

    Args:
        profile: Raw profile data from Apify

    Returns:
        Parsed profile data
    """
    # Extract bio from about or headline
    bio = profile.get("about") or profile.get("headline") or ""

    # Extract skills/expertise
    expertise = []
    skills = profile.get("skills", [])
    for skill in skills[:10]:  # Limit to top 10 skills
        if isinstance(skill, dict) and "title" in skill:
            expertise.append(skill["title"])
        elif isinstance(skill, str):
            expertise.append(skill)

    # Parse education
    education = []
    educations = profile.get("educations", [])
    for edu in educations:
        education_entry = {
            "school": edu.get("title", ""),
            "degree": edu.get("subtitle", ""),
            "field": "",  # Not directly available in response
            "year": edu.get("caption", ""),
        }
        # Only add if we have meaningful data
        if education_entry["school"]:
            education.append(education_entry)

    # Parse work experience
    work_experience = []
    experiences = profile.get("experiences", [])
    for exp in experiences:
        # Skip if it's a breakdown experience
        if exp.get("breakdown", False):
            continue

        # Parse company name and title from subtitle
        subtitle = exp.get("subtitle", "")
        title = exp.get("title", "")

        # Try to extract company from subtitle (format: "Company · Type")
        company = ""
        if " · " in subtitle:
            company = subtitle.split(" · ")[0]

        # Parse dates from caption
        caption = exp.get("caption", "")
        start_date = ""
        end_date = ""

        if " - " in caption:
            dates = caption.split(" - ")[0]
            if dates:
                start_date = dates.strip()
            if len(caption.split(" - ")) > 1:
                end_part = caption.split(" - ")[1].split(" · ")[0]
                end_date = end_part.strip()

        # Get description from subComponents if available
        description = ""
        sub_components = exp.get("subComponents", [])
        if sub_components and len(sub_components) > 0:
            desc_list = sub_components[0].get("description", [])
            if desc_list:
                # Join text from description components
                description = " ".join(
                    [
                        item.get("text", "")
                        for item in desc_list
                        if isinstance(item, dict)
                        and item.get("type") == "textComponent"
                    ]
                )

        work_entry = {
            "company": company,
            "title": title,
            "startDate": start_date,
            "endDate": end_date,
            "description": description,
        }

        # Only add if we have meaningful data
        if work_entry["company"] or work_entry["title"]:
            work_experience.append(work_entry)

    # Extract name and location info
    first_name = profile.get("firstName", "")
    last_name = profile.get("lastName", "")
    city = ""
    country = ""

    # Try to extract city and country from address
    address = profile.get("addressWithCountry", "") or profile.get(
        "addressWithoutCountry", ""
    )
    if address:
        # Format is typically "City, State, Country" or "City Area"
        parts = address.split(", ")
        if len(parts) >= 1:
            city = parts[0]
        # Get country from addressCountryOnly
        country = profile.get("addressCountryOnly", "")

    return {
        "firstName": first_name,
        "lastName": last_name,
        "city": city,
        "country": country,
        "bio": bio,
        "expertise": expertise,
        "education": education,
        "work_experience": work_experience,
    }
