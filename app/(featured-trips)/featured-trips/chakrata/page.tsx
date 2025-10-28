"use client";
import { BlogDetail } from "@/components/blog/blog-detail";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

export default function ChakrataFriendsBlog() {
  const blog = {
    id: "2",
    title: "Chakrata Adventures on a Budget",
    summary:
      "Hidden trails, waterfalls, laughter, and bonfires — a 3-day budget trip with friends in the offbeat hills of Uttarakhand.",
    coverImage: "/images/chakrata.webp",
    tags: ["Friends", "Adventure", "Budget", "Uttarakhand"],
    authorName: "Trippy Explorer",
    createdAt: new Date().toISOString(),
    readingTime: 10,
    likes: 198,
    content: `
<h2>Day 1: Arrival, Settling In, Sunset View</h2>
<p>We set off from Delhi early in an affordable shared taxi, splitting cost among friends. By midday we reached Chakrata and checked into a budget-friendly lodge with bunk rooms and fantastic valley view.</p>
<p>Afternoon: A casual walk to the local market; we sampled roadside chai, small momos, and chatted with local folks about lesser-known trails.</p>
<p>Evening: We drove up to Chilmiri Neck viewpoint for sunset — bamboo and deodars around us, the horizon red-gold, the cool breeze laughing across our faces.</p>
<p>Dinner: At a simple local dhaba with warm dal-roti, garlic naan and laughter echoing among friends.</p>

<h2>Day 2: Adventure Mode</h2>
<p>Morning: After breakfast we took off for Tiger Falls — the trail winds through forest, the roar of water grows louder, and when we reached the pool at the base we dove in. Cold, shocking at first, then exhilarating.</p>
<p>Midday: Picnic lunch by the water; sandwiches, fruits, hot tea from a traveller-run stall.</p>
<p>Afternoon: We headed to the mysterious Budher Caves — narrow rocky tunnels, echoing chambers, and a sense of discovery. Later: hammock time, drone shots, just chilling.</p>
<p>Evening: Bonfire in the lodge yard. Someone brought a guitar; we sang badly, laughed properly, roasted marshmallows, and watched stars appear.</p>

<h2>Day 3: Hidden Trails & Departure</h2>
<p>Morning: We headed to Deoban plateau for panoramic Himalayan views. The early haze lifted, the ridges behind us sharpened, friends clicking photos, the moment freezing as we stood silent for a bit.</p>
<p>Brunch: At a hillside café with omelettes and greens from nearby fields.</p>
<p>Late morning: We visited local craft stalls and picked up woollen caps and trinkets — one friend challenged us to pick the funniest souvenir each.</p>
<p>Afternoon: Drive back; on the way, we stopped at a viewpoint, had chai at a roadside stall, said “Next trip where?” and all nodded.</p>
<p><strong>Why it works for friends</strong>: Affordable, slightly off-beat, packed with nature & laughter. You do not need luxury, you need those moments.</p>
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
