import { redirect } from "next/navigation";

// No standalone home page — send visitors straight to the quizzes dashboard.
export default function Home() {
  redirect("/quizzes");
}
