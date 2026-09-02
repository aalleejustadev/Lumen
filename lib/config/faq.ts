export type Question = {
  id: string
  question: string
  answer: string
}

export const questions: Question[] = [
  {
    id: "keep-forever",
    question: "Do I keep a course forever if I buy it?",
    answer:
      "Yes. Any course you purchase outright stays in your library permanently, including future updates the instructor makes. Courses accessed through Lumen Business are available while your plan is active.",
  },
  {
    id: "both-roles",
    question: "Can I be both a learner and an instructor?",
    answer:
      "One account covers both. Switch modes from the sidebar and the whole workspace follows — your courses, notes, and payouts stay where you left them.",
  },
  {
    id: "instructor-earnings",
    question: "How much do instructors earn?",
    answer:
      "You keep up to 70% of revenue on every sale, with no listing fees. Payouts run on the 1st of each month once your balance passes $100.",
  },
  {
    id: "refunds",
    question: "What is the refund policy?",
    answer:
      "Every course purchase is covered by a 30-day refund guarantee, no questions asked. Lumen Business can be cancelled any time and stays active until the end of the period you paid for.",
  },
  {
    id: "equipment",
    question: "Do I need any equipment to teach?",
    answer:
      "A laptop and a decent microphone are enough to start. The builder handles video hosting, transcoding, and captions, so there is nothing to install or configure.",
  },
]
