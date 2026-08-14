import { redirect } from "next/navigation";

// The spec (project.txt) doesn't define a home page — `/quizzes` is the
// natural landing point (the dashboard).
export default function Home() {
  redirect("/quizzes");
}
