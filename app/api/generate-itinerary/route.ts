import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      ? `Must-see locations: ${mustSees.map((ms: { name: any; address: any; }) => `${ms.name}${ms.address ? ` (${ms.address})` : ''}`).join(', ')}.`
      : '';

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: `You are a helpful travel assistant. Create a ${numDays}-day itinerary for the given city, with activities broken down by morning, afternoon, and evening for each day. ${mustSeesString} Include these must-see locations in the itinerary. Ensure that each day, including Day 1, has activities planned for morning, afternoon, and evening. Do not use asterisks (*) in your response.` },
        { role: "user", content: `Create a ${numDays}-day itinerary for ${city}. Please format your response with 'Day X:', 'Morning:', 'Afternoon:', and 'Evening:' headers for each day, followed by a list of activities for each part of the day. Ensure that each day has at least one activity for morning, afternoon, and evening. Do not use asterisks in your response.` }
      ],
      temperature: 0.6,
    });

    const itinerary = completion.choices[0].message.content;

    if (!itinerary) {
      console.error("No itinerary generated from OpenAI");
      return NextResponse.json({ error: "Failed to generate itinerary" }, { status: 500 });
    }

    // Remove any remaining asterisks from the itinerary
    const cleanedItinerary = itinerary.replace(/\*/g, '');

    return NextResponse.json({ result: cleanedItinerary });
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




















