export type Testimonial = {
  id: string
  name: string
  role: string
  avatar: string
  audience: "Instructor" | "Learner"
  quote: string
}

export const testimonials: Testimonial[] = [
  {
    id: "nadia-rahman",
    name: "Nadia Rahman",
    role: "Product designer · London",
    avatar: "/testimonials/nadia-rahman.png",
    audience: "Learner",
    quote:
      "I finally finished a course instead of abandoning it at lesson four. The timestamped notes meant revision took minutes, not another full rewatch.",
  },
  {
    id: "simon-simorangkir",
    name: "Simon Simorangkir",
    role: "Illustrator · 12,480 students",
    avatar: "/testimonials/simon-simorangkir.png",
    audience: "Instructor",
    quote:
      "I published my first course in a weekend and it has paid more than a year of freelance retainers. The builder gets out of the way, which is all I ever wanted.",
  },
  {
    id: "priya-nadar",
    name: "Priya Nadar",
    role: "Head of L&D, Ridgeline",
    avatar: "/testimonials/priya-nadar.png",
    audience: "Learner",
    quote:
      "We rolled Lumen out to forty people in a week. The completion numbers are the first ones I have ever been happy to put in a board deck.",
  },
  {
    id: "marco-devine",
    name: "Marco Devine",
    role: "Engineer · 48,300 students",
    avatar: "/testimonials/marco-devine.png",
    audience: "Instructor",
    quote:
      "Payments, hosting and support stopped being my problem overnight. I write the lessons, answer the questions, and the rest of it just runs.",
  },
]
