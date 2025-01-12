import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function validateItinerary(itinerary: string, numDays: number): { isValid: boolean; reason?: string } {
  const days = itinerary.split(/Day \d+:/).filter(Boolean);
  if (days.length < numDays) return { isValid: false, reason: `Expected ${numDays} days, but got ${days.length}` };

  for (let i = 0; i < numDays; i++) {
    const day = days[i];
    const requiredSections = ['Morning:', 'Afternoon:', 'Evening:'];
    for (const section of requiredSections) {
      if (!day.includes(section)) {
        return { isValid: false, reason: `Day ${i + 1} is missing ${section} section` };
      }
    }
    
    const activities = day.match(/\d+\./g);
    if (!activities || activities.length < 2) {
      return { isValid: false, reason: `Day ${i + 1} has fewer than 2 activities` };
    }

    // Check if all activities have addresses
    const addressCount = (day.match(/Address:/g) || []).length;
    if (addressCount < activities.length) {
      return { isValid: false, reason: `Day ${i + 1} has activities missing addresses` };
    }
  }
  return { isValid: true };
}

function formatItinerary(itinerary: string, numDays: number): string {
  const days = itinerary.split(/Day \d+:/).filter(Boolean);
  return days.slice(0, numDays).map((day, index) => `Day ${index + 1}:${day}`).join('\n\n');
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key not configured");
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { city, days, mustSees } = body;

    if (!city || city.trim().length === 0) {
      return NextResponse.json({ error: "Please enter a valid city" }, { status: 400 });
    }

    const numDays = parseInt(days, 10);
    if (isNaN(numDays) || numDays < 1) {
      return NextResponse.json({ error: "Invalid number of days" }, { status: 400 });
    }

    const mustSeesString = mustSees.length > 0
      ? `Must-see locations: ${mustSees.map((ms: { name: string, address?: string }) => `${ms.name}${ms.address ? ` (${ms.address})` : ''}`).join(', ')}.`
      : '';

    const systemPrompt = `You are a knowledgeable travel assistant. Create a detailed ${numDays}-day itinerary for ${city}, focusing on must-see locations and efficient travel. ${mustSeesString} Include these must-see locations in the itinerary. You MUST provide SPECIFIC activities for EVERY time slot (Morning, Afternoon, Evening) for EACH day, including Lunch and Dinner. Do not leave any slot empty or generic. EVERY activity MUST include a specific address. Format the itinerary EXACTLY as follows for EACH day:

Day X:

Morning:
1. [Specific Attraction Name] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction]
[Specific transportation information]

2. [Next Specific Attraction] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction]
[Specific transportation information]

Lunch (Start Time – End Time):
[Specific Restaurant Name]

[Brief description of cuisine - 1 sentence]
Address: [Specific address for the restaurant]

Afternoon:
3. [Specific Attraction Name] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction]
[Specific transportation information]

Evening:
4. [Specific Attraction or Activity] (Start Time – End Time)

[Brief description - 1-2 sentences]
Address: [Specific address for the attraction/activity]
[Specific transportation information]

Dinner (Start Time – End Time):
[Specific Restaurant Name or Dining Area]

[Brief description of cuisine or dining experience - 1 sentence]
Address: [Specific address for the restaurant/dining area]

Repeat this EXACT format for each day, up to Day ${numDays}. Provide at least 2 activities per day, but aim for 4-5 if possible. Do not add any extra text or explanations outside of this format.`;

    let itinerary = '';
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a detailed ${numDays}-day itinerary for ${city} with specific activities for every part of each day, including Morning, Afternoon, Evening, Lunch, and Dinner. Generate EXACTLY ${numDays} day(s), no more and no less. Remember to include a specific address for EVERY activity.` }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      itinerary = completion.choices[0].message.content || '';
      itinerary = formatItinerary(itinerary, numDays);

      const validationResult = validateItinerary(itinerary, numDays);
      if (validationResult.isValid) {
        break;
      }

      console.warn(`Attempt ${attempts + 1} failed: ${validationResult.reason}`);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.error(`Failed to generate a valid itinerary after ${maxAttempts} attempts.`);
      return NextResponse.json({ error: "Failed to generate a valid itinerary. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ result: itinerary });
  } catch (error: any) {
    console.error("Error in generate-itinerary API:", error);
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return NextResponse.json({ error: error.response.data }, { status: error.response.status });
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return NextResponse.json({ error: 'An error occurred during your request.' }, { status: 500 });
    }
  }
}

