import type { HelpArticle } from "@/lib/config/help-article"

/**
 * The instructor help centre's articles — two per topic in
 * `lib/config/instructor-help.ts`, which is where the six categories live.
 *
 * **None of this is the student export's copy.** The design that was measured
 * (`ui-design/light/dashboard/student/help-center-article-page.png`) draws a
 * learner's "Getting started with Lumen"; the layout is reused exactly and
 * every word here is written for someone teaching instead.
 *
 * The rules quoted are the ones the codebase actually enforces, the standard
 * the FAQ answers already hold themselves to: two business days in review and
 * editing stays open while it runs (`admin-courses.ts`' queue), a decision
 * written onto the submission rather than the course alone, the per-sale
 * revenue-share snapshot (`OrderItem.revenueShareBps`), earnings clearing
 * before a run (`InstructorEarning.clearsAt`), payouts on a schedule the
 * instructor owns (`Instructor.payoutDayOfMonth` / `minimumPayoutCents`), and
 * "never removed for being critical" (`lib/config/admin-reviews.ts`). Where a
 * figure would date the text — the share, the threshold — the sentence names
 * the screen that holds it rather than the number, so an admin changing a
 * platform default cannot make an article wrong. The two places a number
 * genuinely belongs are the FAQ answers, which read it per request.
 *
 * `readMinutes` is authored rather than computed from word count: these are
 * short by design and a computed figure would read "1 min" for all twelve.
 */
export const instructorHelpArticles: HelpArticle[] = [
  // — Becoming an instructor ------------------------------------------------
  {
    slug: "getting-started-as-an-instructor",
    categorySlug: "becoming-an-instructor",
    title: "Getting started as an instructor",
    lead: "Instructor mode is a workspace of its own — its own navigation, its own permissions, its own URL. This guide covers the first hour: finding the workspace, filling in the profile students will judge you by, and getting a first course as far as the review queue.",
    readMinutes: 4,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Switch into instructor mode",
        paragraphs: [
          "The Student / Instructor control at the top of the sidebar is a switch between two workspaces, not a filter on one. Choosing Instructor loads a different shell at its own address, with teaching navigation, a teaching command palette and the permissions that go with them — your learning, your cart and your wishlist stay in student mode, where they belong.",
          "The switch only offers Instructor once you have a teaching profile. If it is greyed out, your application has not been approved yet; nothing you do in the meantime is lost.",
        ],
        callout: {
          label: "Tip",
          body: "The collapse control beside the search field shrinks the sidebar to icons, and that preference follows you across both modes.",
        },
      },
      {
        title: "2. Fill in your public profile",
        paragraphs: [
          "Your instructor profile is the page a student reads before deciding to buy. It carries your name, your title, a one-line bio for the course page's instructor card, a longer About for the profile itself, and your skills. The one-liner and the long version are separate fields on purpose — the same story has to work at two lengths.",
          "Add a photo. Every course card, review reply and Q&A answer you post is attributed to this profile, and an initials avatar beside a paid course reads as unfinished.",
        ],
      },
      {
        title: "3. Draft your first course",
        paragraphs: [
          "Create Course walks through the landing page, the curriculum, and pricing. A course stays a draft, visible only to you, until you submit it — so there is no cost to starting it before you know how it ends.",
          "Aim for the smallest complete thing. A tight four-hour course that a student finishes beats a twenty-hour one they abandon, and completion is what earns the reviews that sell the next one.",
        ],
      },
      {
        title: "4. Submit it for review",
        paragraphs: [
          "Submitting moves the course into the platform's review queue. You can keep editing while it sits there — your changes are picked up when it is approved — and you will get a notification either way.",
          "If it comes back with changes requested, the reasons are attached to that submission and shown on the course, so you are never guessing what to fix.",
        ],
      },
    ],
    related: [
      "what-happens-during-course-review",
      "building-your-curriculum",
      "content-standards-for-published-courses",
      "how-your-earnings-are-calculated",
    ],
  },
  {
    slug: "what-happens-during-course-review",
    categorySlug: "becoming-an-instructor",
    title: "What happens during course review",
    lead: "Every course is read by a person before it goes on sale. Review usually takes up to two business days, and there are only three ways it can end.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. What a reviewer checks",
        paragraphs: [
          "A reviewer works through a fixed checklist: that the landing page describes what the course actually teaches, that the curriculum matches the advertised lesson count and runtime, that audio is clear enough to learn from, and that the course closes with something that tests understanding.",
          "The verdict on each item is recorded against that submission, not against the course, so a resubmission is judged on its own terms rather than inheriting an old opinion.",
        ],
      },
      {
        title: "2. The three outcomes",
        paragraphs: [
          "Approved publishes the course and starts its sales history. Changes requested sends it back with the failing checklist items and a note — fix them and resubmit. Rejected is the one decision you cannot resubmit against; it is reserved for courses the platform will not carry at all.",
          "Whichever it is, the decision and its reasons stay on the course, so you can read them again later.",
        ],
        callout: {
          label: "Tip",
          body: "Keep editing while a course is in review. Nothing is frozen, and your latest draft is what goes live on approval.",
        },
      },
      {
        title: "3. If you disagree",
        paragraphs: [
          "Reply to the decision notification and a moderator will look again. Disputes are about whether the checklist was applied correctly — they are not a second opinion on taste.",
        ],
      },
    ],
    related: [
      "getting-started-as-an-instructor",
      "content-standards-for-published-courses",
      "how-review-disputes-work",
      "building-your-curriculum",
    ],
  },

  // — Course creation -------------------------------------------------------
  {
    slug: "building-your-curriculum",
    categorySlug: "course-creation",
    title: "Building your curriculum",
    lead: "A curriculum is sections holding lessons, and students see the whole of it before they buy. Structure it so the shape of the course answers the question they are actually asking: what will I be able to do at the end?",
    readMinutes: 4,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Start from the outcomes",
        paragraphs: [
          "Write the four or five things a student will be able to do when they finish, then group them into sections. Sections that came from outcomes tend to be the right size on their own; sections invented first tend to sprawl.",
          "Those outcomes are also what the sale page lists, so writing them early means you are not inventing marketing copy after the fact.",
        ],
      },
      {
        title: "2. Keep lessons short",
        paragraphs: [
          "Six to twelve minutes is the range students finish. Anything past twenty is where drop-off starts, and a lesson covering two ideas is nearly always two lessons.",
          "The lesson list and total runtime are both public before purchase, so an honest structure is doing sales work as well as teaching work.",
        ],
        callout: {
          label: "Tip",
          body: "Reorder sections and lessons by dragging them. Progress already recorded follows the lesson, not its position, so a reshuffle never loses anyone's place.",
        },
      },
      {
        title: "3. Close each section with a check",
        paragraphs: [
          "A short quiz at the end of a section gives the student a reason to consolidate and gives you a signal about which lesson was unclear. Review expects a course to close with one.",
        ],
      },
    ],
    related: [
      "lesson-types-and-quizzes",
      "what-happens-during-course-review",
      "getting-started-as-an-instructor",
      "answering-student-questions",
    ],
  },
  {
    slug: "lesson-types-and-quizzes",
    categorySlug: "course-creation",
    title: "Lesson types and quizzes",
    lead: "Lessons carry video, reading or a quiz. Mixing them deliberately is most of what separates a course students finish from one they leave open in a tab.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Video, reading and quizzes",
        paragraphs: [
          "Video is for demonstration — anything a student needs to watch you do. Reading is for reference they will come back to, where scrubbing a video is the wrong interaction. Quizzes are for checking understanding before the course moves on.",
          "Analytics reports where students spend their time across the three, which is the honest way to find out whether your reading lessons are being read.",
        ],
      },
      {
        title: "2. Writing questions worth answering",
        paragraphs: [
          "Ask about the decision, not the vocabulary. A question a student can answer by recognising a word tests nothing; one that makes them choose between two reasonable approaches tells both of you whether the lesson landed.",
          "Keep quizzes to five or six questions. A student who fails can retake it, so the point is the feedback rather than the gate.",
        ],
      },
      {
        title: "3. Preview lessons",
        paragraphs: [
          "Marking a lesson as a free preview lets prospective students watch it from the sale page. Pick one that demonstrates how you teach rather than the introduction — the introduction sells the topic, and they are already interested in the topic.",
        ],
      },
    ],
    related: [
      "building-your-curriculum",
      "answering-student-questions",
      "choosing-a-list-price",
      "what-happens-during-course-review",
    ],
  },

  // — Teaching & students ---------------------------------------------------
  {
    slug: "answering-student-questions",
    categorySlug: "teaching-and-students",
    title: "Answering student questions",
    lead: "Q&A is the highest-leverage thing in your workspace. Every answer is read by the students who come after the one who asked, so a good answer is written once and works for years.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Answer where it will be found",
        paragraphs: [
          "Questions are attached to the lesson they were asked from, so answer them there rather than by message. The next student stuck on the same lesson sees the thread without having to ask again.",
          "Your Q&A row carries a count of what is waiting, and it is the number worth keeping near zero.",
        ],
      },
      {
        title: "2. Fix the lesson, not just the thread",
        paragraphs: [
          "The same question arriving three times is a lesson problem, not a Q&A problem. Edit the lesson, then answer the thread with what changed.",
        ],
        callout: {
          label: "Tip",
          body: "A question you answer with a link to another of your lessons is doing two jobs — it resolves the thread and shows the student the course hangs together.",
        },
      },
      {
        title: "3. Keep discussions separate",
        paragraphs: [
          "Q&A is for getting unstuck; Discussions is for the conversations around the subject. Moving a sprawling thread to Discussions keeps the lesson's Q&A readable for the person who is stuck right now.",
        ],
      },
    ],
    related: [
      "running-discussions-in-your-course",
      "lesson-types-and-quizzes",
      "how-review-disputes-work",
      "building-your-curriculum",
    ],
  },
  {
    slug: "running-discussions-in-your-course",
    categorySlug: "teaching-and-students",
    title: "Running discussions in your course",
    lead: "Discussions are where a course stops being a video library and starts being a cohort. They need seeding and a light hand, and not much else.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Seed the first threads yourself",
        paragraphs: [
          "An empty board stays empty. Post two or three real prompts tied to the work — something a student can answer from what they have just built rather than from opinion.",
        ],
      },
      {
        title: "2. Reply early, then step back",
        paragraphs: [
          "Instructor replies in the first weeks set the tone for everything after, and then the useful thing is to let students answer each other. Stepping in on every thread teaches a board to wait for you.",
        ],
      },
      {
        title: "3. Moderation",
        paragraphs: [
          "You can remove posts that break the guidelines in topics you moderate. Disagreement is not a guideline breach — a student arguing that your approach is wrong is the board working.",
        ],
      },
    ],
    related: [
      "answering-student-questions",
      "content-standards-for-published-courses",
      "how-review-disputes-work",
      "getting-started-as-an-instructor",
    ],
  },

  // — Earnings & payouts ----------------------------------------------------
  {
    slug: "how-your-earnings-are-calculated",
    categorySlug: "earnings-and-payouts",
    title: "How your earnings are calculated",
    lead: "Every sale writes an earnings record the moment it is paid. Knowing what that record holds explains every number on your Revenue page.",
    readMinutes: 4,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Gross, platform share, net",
        paragraphs: [
          "A sale records what the student actually paid, the platform's share of it, and your net. Discounts come off before the split, so a coupon reduces both sides rather than only yours.",
          "Your share is shown on the Revenue page and answered exactly in the help centre's Frequently asked — it is read from the platform's current setting rather than written into this guide, so it cannot go stale here.",
        ],
      },
      {
        title: "2. The rate is fixed at the moment of sale",
        paragraphs: [
          "The share that applies is the one in force when the purchase happens, and it is stored on the order. If the platform default changes later, nothing you have already earned is repriced — which also means a run paid two years from now uses the old rate, correctly.",
        ],
      },
      {
        title: "3. Clearing and refunds",
        paragraphs: [
          "Earnings are pending for about thirty days before they become available to pay out. That window is what lets a refund be handled cleanly: a refunded sale reverses its earnings record instead of clawing money back out of a payout that already went.",
        ],
        callout: {
          label: "Tip",
          body: "Gross revenue on your Analytics page is deliberately before refunds. Compare it with your net for the same period to see the real refund rate on a course.",
        },
      },
    ],
    related: [
      "setting-up-payouts",
      "choosing-a-list-price",
      "running-coupons-and-promotions",
      "how-review-disputes-work",
    ],
  },
  {
    slug: "setting-up-payouts",
    categorySlug: "earnings-and-payouts",
    title: "Setting up payouts",
    lead: "Payouts run on a schedule you control, to a method you nominate. Both live in Payout settings, and getting them right once is the whole job.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Add a payout method",
        paragraphs: [
          "You can hold more than one method and mark which is primary; the other stands by as backup. Getting a second one on file before you need it is what turns a failed transfer into a non-event.",
        ],
      },
      {
        title: "2. Your schedule and threshold",
        paragraphs: [
          "Payout settings holds the day of the month a run happens and the minimum balance it needs to reach. A balance under the threshold is not lost — it rolls into the next run. The current values for your account are in the help centre's Frequently asked, which reads them from your own settings.",
        ],
      },
      {
        title: "3. When a transfer fails",
        paragraphs: [
          "A failed transfer usually means stale bank details. Fix the method and the balance joins the next scheduled run automatically — there is nothing to retry by hand, and nothing is written off.",
        ],
      },
    ],
    related: [
      "how-your-earnings-are-calculated",
      "running-coupons-and-promotions",
      "choosing-a-list-price",
      "getting-started-as-an-instructor",
    ],
  },

  // — Pricing & coupons -----------------------------------------------------
  {
    slug: "choosing-a-list-price",
    categorySlug: "pricing-and-coupons",
    title: "Choosing a list price",
    lead: "Price is a claim about what the course is worth, and students read it that way. Set it against the outcome you deliver rather than the hours you spent recording.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Anchor on the outcome",
        paragraphs: [
          "Runtime is a poor guide — a course that gets someone hired is not worth less because it is short. Look at what published courses promising a comparable outcome charge, and price within that range unless you can say precisely why you are outside it.",
        ],
      },
      {
        title: "2. Changing it later",
        paragraphs: [
          "A new list price applies to future orders only. Nobody is charged again and nobody is refunded the difference, so there is no reason to treat the first price as permanent.",
        ],
        callout: {
          label: "Tip",
          body: "Change price and watch conversion, not revenue. Revenue moves for reasons that have nothing to do with you; the share of visitors who buy is the number your change actually touched.",
        },
      },
      {
        title: "3. Launching",
        paragraphs: [
          "A new course has no reviews, which is the real obstacle rather than the price. A lower launch price that buys your first genuine reviews is usually worth more than the margin it gives up.",
        ],
      },
    ],
    related: [
      "running-coupons-and-promotions",
      "how-your-earnings-are-calculated",
      "setting-up-payouts",
      "building-your-curriculum",
    ],
  },
  {
    slug: "running-coupons-and-promotions",
    categorySlug: "pricing-and-coupons",
    title: "Running coupons and promotions",
    lead: "Coupons are yours; platform promotions are Lumen's. They stack differently and they are worth using for different reasons.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Coupons you issue",
        paragraphs: [
          "A coupon is a code with a discount, a window and a redemption limit. Because they are codes, they are the right tool for something targeted — a cohort, a newsletter, a conference talk — where you want to know which audience converted.",
        ],
      },
      {
        title: "2. Platform promotions",
        paragraphs: [
          "Lumen runs sales across the catalogue. Your courses join by default and you can opt out per course, or for everything you teach, in your promotion settings. A promotion discounts your current list price for as long as it runs.",
        ],
      },
      {
        title: "3. Discounts and your earnings",
        paragraphs: [
          "Discounts come off before the platform split, so a promotion reduces the platform's share in the same proportion as yours. The reach is usually worth it on a back-catalogue course and rarely worth it in a launch week, when you want full-price reviews.",
        ],
      },
    ],
    related: [
      "choosing-a-list-price",
      "how-your-earnings-are-calculated",
      "setting-up-payouts",
      "content-standards-for-published-courses",
    ],
  },

  // — Policies & standards --------------------------------------------------
  {
    slug: "content-standards-for-published-courses",
    categorySlug: "policies-and-standards",
    title: "Content standards for published courses",
    lead: "The standards are short and they are all about the student getting what they were promised. Most rejections are accuracy or rights, not quality.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Teach what you advertised",
        paragraphs: [
          "The landing page is a promise. If the course drifts as you build it, update the outcomes and the description before you submit — a course that delivers something different from its sale page is the most common reason one is sent back.",
        ],
      },
      {
        title: "2. Rights to everything you use",
        paragraphs: [
          "Footage, music, images, code and slides all need to be yours or licensed for commercial use, and attribution alone is not a licence. Keep the licences where you can find them; a rights dispute is resolved much faster when you can produce one.",
        ],
      },
      {
        title: "3. Keep it current",
        paragraphs: [
          "A course teaching a tool that has moved on is inaccurate even if it was right when recorded. Re-record the lessons that have dated, or retire the course — an outdated course earns refunds and one-star reviews in roughly that order.",
        ],
        callout: {
          label: "Tip",
          body: "Add a dated note to the first lesson when a tool changes under you. It buys goodwill while you re-record, and students tell you it did in the reviews.",
        },
      },
    ],
    related: [
      "how-review-disputes-work",
      "what-happens-during-course-review",
      "running-discussions-in-your-course",
      "building-your-curriculum",
    ],
  },
  {
    slug: "how-review-disputes-work",
    categorySlug: "policies-and-standards",
    title: "How review disputes work",
    lead: "You cannot remove a student review, and that is deliberate. What you can do is report one that breaks the guidelines, and reply to the rest.",
    readMinutes: 3,
    updatedAt: "2026-08-12",
    sections: [
      {
        title: "1. Critical is not the same as abusive",
        paragraphs: [
          "Reviews are never removed for being critical — only for breaking the guidelines. A student saying the course was not worth the money is doing exactly what the rating is for; a review containing abuse, spam or personal information is not, and should be reported.",
        ],
      },
      {
        title: "2. Reporting one",
        paragraphs: [
          "Report the review and say which guideline it breaks. A moderator decides, and the outcome is either that it stands, that it is removed, or that it is hidden while the reviewer appeals.",
        ],
      },
      {
        title: "3. Replying is usually better",
        paragraphs: [
          "A calm reply is public and permanent, and every future reader sees it under the complaint. Answering a fair criticism with what you have since changed does more for the next hundred visitors than removing one review ever would.",
        ],
      },
    ],
    related: [
      "content-standards-for-published-courses",
      "answering-student-questions",
      "what-happens-during-course-review",
      "running-discussions-in-your-course",
    ],
  },
]

/** Lookup by slug — the route's `[slug]` segment. */
export function instructorHelpArticle(slug: string): HelpArticle | undefined {
  return instructorHelpArticles.find((article) => article.slug === slug)
}

/** How many articles a topic holds. The help centre's counts read this rather
 *  than carrying a written-down figure, so the two cannot disagree. */
export function instructorArticleCount(categorySlug: string): number {
  return instructorHelpArticles.filter(
    (article) => article.categorySlug === categorySlug
  ).length
}
