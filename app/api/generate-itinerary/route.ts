import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function generateDayItinerary(city: string, dayNumber: number, mustSees: string[], usedActivities: Set<string>): Promise<{ itinerary: string; activities: string[] }> {
  const systemPrompt = `You are a knowledgeable travel assistant. Create a detailed 1-day itinerary for ${city}, focusing on must-see locations and efficient travel. Include these must-see locations if applicable and not already used: ${mustSees.join(', ')}. Provide SPECIFIC activities for Morning, Afternoon, and Evening, including Lunch and Dinner. Every activity MUST include a specific address. Format the itinerary EXACTLY as follows:

Day ${dayNumber}:

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

Provide at least 2 activities per day, but aim for 4-5 if possible. Do not add any extra text or explanations outside of this format. DO NOT REPEAT activities that have already been used: ${Array.from(usedActivities).join(', ')}.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create a detailed 1-day itinerary for day ${dayNumber} in ${city} with specific activities for Morning, Afternoon, Evening, Lunch, and Dinner. Remember to include a specific address for EVERY activity and DO NOT REPEAT activities from previous days.` }
    ],
    temperature: 0.7,
    max_tokens: 1000,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
  });

  const itinerary = completion.choices[0].message.content || '';
  const newActivities = itinerary.match(/\d+\.\s(.+?)\s\(/g)?.map(match => match.replace(/\d+\.\s/, '').replace(/\s\($/, '')) || [];

  return { itinerary, activities: newActivities };
}

async function getCachedActivities(city: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('cached_activities')
    .select('activities')
    .eq('city', city)
    .single();

  if (error) {
    console.error('Error fetching cached activities:', error);
    return [];
  }

  return data?.activities || [];
}

async function cacheActivities(city: string, activities: string[]) {
  const { error } = await supabase
    .from('cached_activities')
    .upsert({ city, activities }, { onConflict: 'city' });

  if (error) {
    console.error('Error caching activities:', error);
  }
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key not configured");
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  const body = await req.json();
  const { city, days, mustSees } = body;

  if (!city || city.trim().length === 0) {
    return NextResponse.json({ error: "Please enter a valid city" }, { status: 400 });
  }

  const numDays = parseInt(days, 10);
  if (isNaN(numDays) || numDays < 1) {
    return NextResponse.json({ error: "Invalid number of days" }, { status: 400 });
  }

  const cachedActivities = await getCachedActivities(city);

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const usedActivities = new Set<string>();

  (async () => {
    try {
      let fullItinerary = '';
      for (let i = 0; i < numDays; i++) {
        const { itinerary, activities } = await generateDayItinerary(city, i + 1, [...mustSees, ...cachedActivities], usedActivities);
        fullItinerary += (i > 0 ? '\n\n' : '') + itinerary;
        activities.forEach(activity => usedActivities.add(activity));
      }

      // Cache new activities
      const newActivities = Array.from(usedActivities);
      await cacheActivities(city, Array.from(new Set([...cachedActivities, ...newActivities])));

      await writer.write(encoder.encode(JSON.stringify({ result: fullItinerary })));
    } catch (error) {
      console.error("Error generating itinerary:", error);
      await writer.write(encoder.encode(JSON.stringify({ error: 'An error occurred during itinerary generation.' })));
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'application/json' },
  });
}

