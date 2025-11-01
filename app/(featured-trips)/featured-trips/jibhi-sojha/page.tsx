"use client";

import { BlogFetauredTrips } from "@/components/blog/featured-trips";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import jibhi from "@/public/images/jibhi.jpeg";

export default function JibhiShojaFamilyBlog() {
  const blog = {
    id: "4",
    title: "Family Time in Jibhi & Shoja",
    summary:
      "Wooden cottages, gentle rivers, forest walks — the ideal family hideaway in the Tirthan Valley.",
    coverImage: jibhi,
    tags: ["Family", "Nature", "Himachal"],
    authorName: "Trippy Explorer",
    createdAt: new Date().toISOString(),
    readingTime: 10,
    likes: 95,
    content: `
<h2>Day 1: Arrival, Cottage Time & River Play</h2>
<p>We arrived at Jibhi after the scenic drive through the hills, checked into a wooden cottage by the Tirthan river, windows open to pine forest and water music. Kids raced to the river edge, dipped feet, collected small stones, threw pebbles.</p>
<p>Lunch: Simple Himachali thali in the cottage yard.</p>
<p>Afternoon: We walked to the nearby Jibhi Waterfall—easy trail, safe for kids, forest canopy overhead. Stop for chai at a little stall, the children giggling at frogs and fishes in the stream.</p>
<p>Evening: Back at the cottage, we built a tiny fire-pit, roasted corn, shared stories. The sky darkened early, stars appeared, children pointing them out.</p>

<h2>Day 2: Adventure & Village Life</h2>
<p>Morning: After breakfast, we drove toward Shoja (just over 7 km) – the ride itself a highlight: winding road, forest tunnel, the valley opening.</p>
<p>Midday: In Shoja we went for an easy forest walk to Serolsar Lake (the older kids climbed a bit). The grown-ups sat, tablets off, phones in pockets, just the breeze.</p>
<p>Lunch: Picnic under tall deodar trees; simple sandwiches, apples, local honey.</p>
<p>Afternoon: Back in Jibhi we visited Bahu Village; kids ran around, we rested in hammocks.</p>
<p>Evening: Cottage board games, hot soup, laughter echoing in the woods.</p>

<h2>Day 3: River, Crafts & Departure</h2>
<p>Morning: We spent time by the river bank — skipping stones, the kids chasing small fish, the two of us with coffee standing ankle-deep in cold water.</p>
<p>Mid-morning: We visited a local craft shop — picked up woollen scarves, handmade wooden toys for the kids.</p>
<p>Lunch: On the way out we stopped at a lovely vantage-point for one last view of the valley and mountains.</p>
<p>Afternoon: Drive back. Conversation easy, memories fresh. The region felt untouched, safe, and perfect for a family wanting time together without crowds.</p>
<p><strong>Why this works for families</strong>: Safe trails, nature everywhere, relaxed pace, kids entertained by nature, adults by mountain calm.</p>
    `,
  };

  return (
    <div>
      <Navbar />
      <BlogFetauredTrips blog={blog} />
      <Footer />
    </div>
  );
}
