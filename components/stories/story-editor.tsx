import BlogEditor from "@/components/blog/blog-editor";

export default function StoryEditor() {
  return (
    <BlogEditor
      category="_story"
      redirectAfterPublish="/stories"
      heading="Share Your Journey"
      subheading="Tell the world about your travel adventure — where you went, what you saw, and why it mattered."
      accentVar="--color-brand"
      contextLabel="Stories"
    />
  );
}
