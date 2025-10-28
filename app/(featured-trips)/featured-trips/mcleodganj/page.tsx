"use client";
import { BlogDetail } from "@/components/blog/blog-detail";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

export default function McLeodGanjCoupleBlog() {
  const blog = {
    id: "3",
    title: "McLeod Ganj: Love, Culture & Calm",
    summary:
      "Monasteries, tea gardens, sunset points — a 3-day journey for two through the heart of Little Lhasa.",
    coverImage: "images/mcleodganj.jpg",
    tags: ["Couple", "Culture", "Himachal"],
    authorName: "Trippy Explorer",
    createdAt: new Date().toISOString(),
    readingTime: 9,
    likes: 115,
    content: `
<h2>Day 1: Arrival, Calm & Cultural Immersion</h2>
<p>We arrived late afternoon in McLeod Ganj, the valley breathing, the view of the Dhauladhar range welcoming us. Checked into a guest-house near the main square — balcony with sky, temples, flags.</p>
<p>Evening: We wandered through the market lanes, stopped at a Tibetan café for momos and butter tea, watched monks pass by in maroon robes, the wind cool on our faces. Evening walk up to Naddi viewpoint to catch sunset — the sun melting behind peaks. Magic.</p>

<h2>Day 2: Culture & Hills</h2>
<p>Morning: Visit the Tsuglagkhang Complex (the residence & temple of the Dalai Lama). We walked the kora, spun prayer wheels, heard the chants and felt calm.</p>
<p>Late morning: Snack break at a café opposite the Kalachakra temple; relaxed, watched monks, tourists, locals.</p>
<p>Afternoon: Trek to the Bhagsu Waterfall — gorgeous valley trail, the water booming at the end, we splashed our hands, took silly photos.</p>
<p>Evening: Relaxation time. A spa-style foot-soak by the guest-house for tired legs, then dinner at a balcony restaurant with Himalayan chilli chicken, garlic naan, and half-melted smiles.</p>

<h2>Day 3: Trail & Reflection</h2>
<p>Morning: Early start for the short trek to Triund (or at least the viewpoint before it) – forest trail, rhododendrons, open meadow at the top, views that say “you climbed here for this”.</p>
<p>Midday: Back down, brunch in Dharamkot village — simple food, wildflowers, quiet.</p>
<p>Afternoon: Drive to the tea gardens of Dharamshala, picked a viewpoint, sat in silence, just the two of us.</p>
<p>Evening: We climbed to a rooftop café, hot chocolate in hand, city lights below, mountains around, and a calm beat in our hearts.</p>
<p><strong>Why it’s perfect for couples</strong>: A mix of culture, nature, café moments, quiet conversations and a “just us” feel.</p>
    `,
  };

  return (
    <div>
      <Navbar />
      <BlogDetail blog={blog} />
      <Footer />
    </div>
  );
}
