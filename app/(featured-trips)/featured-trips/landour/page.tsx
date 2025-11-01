"use client";
import { BlogFetauredTrips } from "@/components/blog/featured-trips";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import landourImg from "@/public/images/landour.avif";

export default function LandourCoupleBlog() {
  const blog = {
    id: "1",
    title: "A Romantic Escape to Landour",
    summary:
      "Colonial lanes, cinnamon waffles, pine forests, and quiet sunsets — a slow 3-day getaway for two in the misty hills of Uttarakhand.",
    coverImage: landourImg,
    tags: ["Couple", "Romantic", "Uttarakhand"],
    authorName: "Trippy Explorer",
    createdAt: new Date().toISOString(),
    readingTime: 10,
    likes: 134,
    content: `
<h2>Day 1: Arrival, Coffee & First Walk</h2>
<p>We arrived mid-morning from Dehradun, the taxi winding up the green slopes until we reached Landour. The air felt crisp, the deodar trees all around, and a sense of calm you don’t often find. We checked into a little heritage cottage tucked among pines, dropped our bags and set out for breakfast at the famed “Char Dukan” area. Over cinnamon waffles and hot chai at a little café, we watched mist roll over rooftops.</p>
<p>After breakfast we wandered the lanes of Sisters Bazaar, peeking into the old colonial cottages, churches, and local shops (including the old-time Prakash Store for jams and chutneys). Evening: we walked up to Lal Tibba (the highest point in Landour), just in time for sunset—our silhouettes against the Himalayan ridges, the valley below turning gold. We paused at a viewpoint, holding hands, sipping hot lemon-ginger tea from a roadside stand.</p>
<p>By dinner we were back in the cottage, fireplaces alight, low music, just two of us and the mountain night.</p>

<h2>Day 2: Explore & Slow-Down</h2>
<p>Morning: We woke early for a walk along the “Landour Loop” (aka the “Gol Chakkar” walk) — a quiet circuit through forests, pines, rhododendron bushes, old firs and colonial houses.</p>
<p>Mid-morning: We visited Kellogg’s Church (a beautiful Gothic-style church), then hopped into a local jeep for a short ride to the old house of George Everest near Hathipaon, where the views feel endless.</p>
<p>Lunch: At Ivy Café, overlooking a slope filled with pines; friendly staff, warm food, and a view that made the go-slow feel automatic.</p>
<p>Afternoon: We visited the Landour Bakehouse in Char Dukan for banana bread and jam, then cooked up a plan to sit for an hour just reading by the balcony — no rushing, no agenda.</p>
<p>Evening: We took the little walk down to Mussoorie’s edge: lights started in the valley far below; we sat at a café terrace, watched dusk, and shared memories. Dinner: A quiet meal at a local bistro, candle lit, with Momos and a hot soup; windows open to the pines.</p>

<h2>Day 3: Nature & Departure</h2>
<p>Morning: We did a short trek into the forested plateau of Jabarkhet Nature Reserve (or the forest trail around). The feeling: pines overhead, soft sunlight, fresh air, birds calling.</p>
<p>Brunch: Back into Landour town centre, we stopped for pancakes and coffee at a café, watched the local residents walk past — contractors, teachers, visitors like us.</p>
<p>Late Morning: We visited Char Dukan again (couldn’t resist pastries) then started packing. Before checkout we wandered the small market and picked up little jars of apple mint chutney from Prakash Store (a Landour specialty).</p>
<p>Afternoon: As we drove away, the valley seemed to stretch behind us; Landour left a gentleness in us, the kind of peace you don’t easily find.</p>
<p><strong>Why you’ll love it</strong>: It’s slow. It’s beautiful. For couples who want to talk, walk, sip coffee, and wake up to green slopes rather than traffic and chaos—it’s perfect.</p>
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
