# Answer evaluation

Generator `gemini:gemini-3.1-flash-lite`, embeddings `gemini:gemini-embedding-001`, retrieval gate 0.6, 2026-11-22.

The checks below are automatic: they say whether the system answered, from which article, or refused. **They cannot say whether an answer is true.** Read every answer and mark it in the "Your verdict" line.

## Answerable questions

| Result | Count |
| --- | --- |
| Answered, cited every needed article | 28 of 28 (100%) |
| Answered, cited only some needed articles | 0 |
| Answered, but cited the wrong article | 0 |
| Wrongly refused | 0 |
| Errors | 0 |

## Out-of-scope questions (the blog has no answer)

| Result | Count |
| --- | --- |
| Refused | 8 of 8 (100%) |
| ...stopped by the retrieval gate (model not called) | 3 |
| ...refused by the model ("not in the sources") | 5 |
| **Answered anyway (possible hallucination)** | 0 |
| Errors | 0 |

## Retrieval scores

Lowest top score among answerable questions: **0.647** (median 0.726). Highest among out-of-scope questions: **0.717**. Gate: 0.6. 5 of 8 out-of-scope questions scored at or above the gate, so only the model's own refusal rule stands between them and an answer.

## Cost and speed

33 generation request(s), 73181 input and 1855 output tokens in total. Median 2.7 s per question, slowest 28.1 s.

## Every question

### q01 · direct · OK

**Question:** তারিক যখন স্পেন অভিযানে নামেন, তখন দামেশকের খলিফা কে ছিলেন?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান

**Mode:** answered, top score 0.759

**Answer:** তারিক বিন জিয়াদ যখন স্পেন অভিযানে নামেন, তখন দামেশকের মসনদে খলিফা ছিলেন আল-ওয়ালিদ বিন আব্দুল মালিক।

**Cited:** তারিক বিন জিয়াদের সাহসী অভিযান (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q02 · direct · OK

**Question:** একাত্তরে খুলনার সীমান্তঘেঁষা এক বাজারের হত্যাযজ্ঞ নিয়ে কোন সাক্ষী কথা বলেছেন?

**Should come from:** যে নদী হয়েছিল রক্ত গঙ্গা

**Mode:** answered, top score 0.738

**Answer:** একাত্তরে খুলনার ডুমুরিয়া উপজেলার চুকনগর বাজারের হত্যাযজ্ঞ নিয়ে প্রত্যক্ষদর্শী সিরাজুল ইসলাম, নিমাই চন্দ্র রায় এবং চুকনগর কলেজের সাবেক অধ্যক্ষ এবিএম শফিকুল ইসলাম কথা বলেছেন।

**Cited:** যে নদী হয়েছিল রক্ত গঙ্গা (part 1); যে নদী হয়েছিল রক্ত গঙ্গা (part 2)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q03 · out-of-scope · REFUSED (correct)

**Question:** বিটকয়েন কী?

**Should come from:** nothing, the blog has no answer

**Mode:** unrelated, top score 0.523

**Closest articles:** পবিত্র শবে বরাতে মুমিনদের করণীয়; যে নদী হয়েছিল রক্ত গঙ্গা; বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q04 · direct · OK

**Question:** ফেলানীকে গুলি করার অভিযোগে অভিযুক্ত বিএসএফ সদস্য প্রথমবার আদালতে কবে ছাড়া পান?

**Should come from:** ফেলানী হত্যার বিচার কই

**Mode:** answered, top score 0.737

**Answer:** ফেলানীকে গুলি করার অভিযোগে অভিযুক্ত বিএসএফ সদস্য অমিয় ঘোষ ২০১৩ সালের ৬ সেপ্টেম্বর বিএসএফ-এর বিশেষ আদালত থেকে প্রথমবার বেকসুর খালাস পান।

**Cited:** ফেলানী হত্যার বিচার কই (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q05 · direct · OK

**Question:** শবে বরাতের রাতে আলোর সাজ, আতশবাজি আর হালুয়া-রুটি নিয়ে লেখকের মত কী?

**Should come from:** পবিত্র শবে বরাতে মুমিনদের করণীয়

**Mode:** answered, top score 0.705

**Answer:** শবে বরাত উপলক্ষে আলোকসজ্জা, আতশবাজি বা হালুয়া-রুটি নিয়ে মেতে ওঠার মতো কোনো ভিত্তি ইসলামে নেই। লেখকের মতে, এই রাতটি ইবাদতের জন্য এবং এই ইবাদত হতে হবে একান্ত ও বিনম্র।

**Cited:** পবিত্র শবে বরাতে মুমিনদের করণীয় (part 2)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q06 · direct · OK

**Question:** আল-আন্দালুস নামটা কোথা থেকে এসেছে বলে মনে করা হয়?

**Should come from:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন

**Mode:** answered, top score 0.668

**Answer:** আল-আন্দালুস নামটি কোথা থেকে এসেছে তা নিয়ে বিভিন্ন মত রয়েছে। তবে সবচেয়ে প্রচলিত ধারণা হলো, এটি প্রাচীন ভ্যান্ডাল গোত্রের নাম থেকে এসেছে, যারা পঞ্চম শতাব্দীতে ওই অঞ্চলে সংক্ষিপ্তকাল শাসন করেছিল।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q07 · direct · OK

**Question:** বঙ্গভঙ্গের পর গঠিত নতুন প্রদেশে প্রথম লেফটেন্যান্ট গভর্নর হিসেবে কে বসেন?

**Should come from:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা

**Mode:** answered, top score 0.712

**Answer:** বঙ্গভঙ্গের পর নবগঠিত প্রদেশের প্রথম লেফটেন্যান্ট গভর্নর হিসেবে স্যার ব্যামফিল্ড ফুলার নিযুক্ত হন।

**Cited:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q08 · cross-lingual · OK

**Question:** How many Bangladeshis did the Indian border force kill in 2023, according to the blog?

**Should come from:** ফেলানী হত্যার বিচার কই

**Mode:** answered, top score 0.727

**Answer:** ২০২৩ সালে বিএসএফের হাতে ৩১ জন বাংলাদেশি নিহত হন।

**Cited:** ফেলানী হত্যার বিচার কই (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q09 · cross-lingual · OK

**Question:** Why did thousands of people gather at Chuknagar in May 1971?

**Should come from:** যে নদী হয়েছিল রক্ত গঙ্গা

**Mode:** answered, top score 0.708

**Answer:** In April and May 1971, thousands of people from areas like Bagerhat, Khulna, Faridpur, and Barishal gathered at Chuknagar to seek refuge and cross the border into India. They considered the area relatively safe and believed it would be easier to reach the border from there.

**Cited:** যে নদী হয়েছিল রক্ত গঙ্গা (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q10 · cross-lingual · OK

**Question:** What does the word Shab-e-Barat mean?

**Should come from:** পবিত্র শবে বরাতে মুমিনদের করণীয়

**Mode:** answered, top score 0.730

**Answer:** শবে বরাত একটি ফারসি শব্দ। এখানে 'শব' মানে রাত এবং 'বরাত' মানে মুক্তি বা ভাগ্য।

**Cited:** পবিত্র শবে বরাতে মুমিনদের করণীয় (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q11 · cross-lingual · OK

**Question:** Why did Tariq ibn Ziyad burn his ships?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান

**Mode:** answered, top score 0.670

**Answer:** Tariq ibn Ziyad ordered his ships to be burned because he saw that his soldiers were frightened by the large number of enemy troops. By destroying the ships, he eliminated any possibility of retreat, leaving his soldiers with only two options: to win the battle or to achieve martyrdom.

**Cited:** তারিক বিন জিয়াদের সাহসী অভিযান (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q12 · mixed · OK

**Question:** Granada এর পতন কবে হয়েছিল?

**Should come from:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন

**Mode:** answered, top score 0.713

**Answer:** গ্রানাডার পতন ১৪৯২ খ্রিস্টাব্দে হয়েছিল।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q13 · mixed · OK

**Question:** Cordoba শহর জ্ঞানচর্চায় এত গুরুত্বপূর্ণ ছিল কেন?

**Should come from:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন

**Mode:** answered, top score 0.655

**Answer:** দশম শতাব্দীর কর্ডোবা খিলাফতের সময় এই শহরটি জ্ঞান-বিজ্ঞান, চিকিৎসা, দর্শন, গণিত, জ্যোতির্বিজ্ঞান, স্থাপত্য ও সাহিত্যে অভূতপূর্ব অগ্রগতি অর্জন করেছিল। শহরটির বিশাল গ্রন্থাগার ও জ্ঞানচর্চার কেন্দ্র থেকে গ্রিক-রোমান, ভারতীয় ও পারস্য জ্ঞান সংরক্ষিত ও অনুবাদিত হতো, যা পরবর্তীকালে ইউরোপে ছড়িয়ে পড়ে নবজাগরণের সূচনায় সহায়তা করে।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q14 · mixed · OK

**Question:** Border killing গুলো নিয়ে India কী প্রতিশ্রুতি দিয়েছিল?

**Should come from:** ফেলানী হত্যার বিচার কই

**Mode:** answered, top score 0.693

**Answer:** ২০২০ সালের ১৯ সেপ্টেম্বর ভারত সীমান্তে মৃত্যুর সংখ্যা শুন্যে নামিয়ে আনার প্রতিশ্রুতি দিয়েছিল।

**Cited:** ফেলানী হত্যার বিচার কই (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q15 · multi-article · OK

**Question:** স্পেনে মুসলিম শাসন কে শুরু করেছিলেন, আর তা কতদিন টিকেছিল?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান + ইউরোপে ৭৮১ বছরের মুসলিম শাসন

**Mode:** answered, top score 0.719

**Answer:** স্পেনে মুসলিম শাসন শুরু করেছিলেন সেনাপতি তারিক বিন জিয়াদ। এই শাসন ৭১১ খ্রিস্টাব্দে শুরু হয়ে ১৪৯২ খ্রিস্টাব্দে গ্রানাডার পতনের মাধ্যমে শেষ হয়, যা প্রায় ৭৮১ বছর স্থায়ী ছিল।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1); তারিক বিন জিয়াদের সাহসী অভিযান (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q16 · multi-article · OK

**Question:** গথ রাজা রডারিক কীভাবে পরাজিত হলেন, আর মুসলিম শাসিত স্পেনের শেষটা কীভাবে হয়েছিল?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান + ইউরোপে ৭৮১ বছরের মুসলিম শাসন

**Mode:** answered, top score 0.731

**Answer:** গথ রাজা রডারিক ওয়াদি লাক্কার যুদ্ধে তারিক বিন জিয়াদ পরিচালিত মুসলিম বাহিনীর কাছে পরাজিত হন এবং পালানোর সময় নিহত হন। স্পেনে মুসলিম শাসনের সমাপ্তি ঘটে ১৪৯২ সালে গ্রানাডা আমিরাতের পতনের মাধ্যমে, যা ৭১১ সালে শুরু হয়েছিল।

**Cited:** তারিক বিন জিয়াদের সাহসী অভিযান (part 2); ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q17 · multi-article · OK

**Question:** ভারতীয় সীমান্তের কাছে সাধারণ মানুষ নিহত হওয়ার কোন কোন ঘটনা ব্লগে আছে?

**Should come from:** ফেলানী হত্যার বিচার কই + যে নদী হয়েছিল রক্ত গঙ্গা

**Mode:** answered, top score 0.724

**Answer:** ব্লগে ভারতীয় সীমান্তের কাছে সাধারণ মানুষ নিহত হওয়ার দুটি প্রধান ঘটনার উল্লেখ আছে। প্রথমটি হলো ২০১১ সালে কুড়িগ্রামের ফুলবাড়ী সীমান্তে বিএসএফ সদস্যের গুলিতে ফেলানী খাতুন হত্যার ঘটনা। দ্বিতীয়টি হলো ১৯৭১ সালের ২০ মে খুলনার ডুমুরিয়া উপজেলার চুকনগর বাজারে পাকিস্তানি বাহিনীর চালানো গণহত্যা, যা ভারত সীমান্তের খুব কাছাকাছি সংঘটিত হয়েছিল।

**Cited:** ফেলানী হত্যার বিচার কই (part 1); যে নদী হয়েছিল রক্ত গঙ্গা (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q18 · digits · OK

**Question:** 1905 সালে বঙ্গভঙ্গের ঘোষণা কবে দেওয়া হয়েছিল?

**Should come from:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা

**Mode:** answered, top score 0.735

**Answer:** ১৯০৫ সালের ১৯ জুলাই বঙ্গভঙ্গের ঘোষণা প্রদান করা হয়েছিল।

**Cited:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q19 · digits · OK

**Question:** ইউরোপে মুসলিম শাসন 781 বছর স্থায়ী হয়েছিল বলা হয়, এটা কবে শুরু আর কবে শেষ?

**Should come from:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন

**Mode:** answered, top score 0.754

**Answer:** ইউরোপে মুসলিম শাসন ৭১১ খ্রিস্টাব্দে শুরু হয় এবং ১৪৯২ খ্রিস্টাব্দে গ্রানাডার পতনের মাধ্যমে শেষ হয়।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q20 · digits · OK

**Question:** চুকনগরে নিহতের সংখ্যা 10 থেকে 12 হাজার, এই হিসাব কাদের?

**Should come from:** যে নদী হয়েছিল রক্ত গঙ্গা

**Mode:** answered, top score 0.757

**Answer:** চুকনগরে নিহতের সংখ্যা ১০ থেকে ১২ হাজার হওয়ার এই হিসাবটি তাদের, যারা সেখানে লাশ ফেলার কাজ করেছিলেন।

**Cited:** যে নদী হয়েছিল রক্ত গঙ্গা (part 2)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q21 · digits · OK

**Question:** তারিক 12000 সৈন্য নিয়ে কোথা থেকে যাত্রা করেন?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান

**Mode:** answered, top score 0.745

**Answer:** তারিক বিন জিয়াদ ৭১১ খ্রিস্টাব্দে ১২ হাজার সৈন্য নিয়ে মরক্কো থেকে যাত্রা করেন।

**Cited:** তারিক বিন জিয়াদের সাহসী অভিযান (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q22 · direct · OK

**Question:** বঙ্গভঙ্গ রদ হওয়ার পর মুসলমানরা কী শিক্ষা নিয়েছিল?

**Should come from:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা

**Mode:** answered, top score 0.786

**Answer:** বঙ্গভঙ্গ রদ হওয়ার পর মুসলমানরা বুঝতে পারে যে ব্রিটিশ বা হিন্দুদের দ্বারা তাদের স্বার্থ সংরক্ষিত হবে না। তারা উপলব্ধি করে যে আপস নয়, বরং সংগ্রামের পথ ধরেই তাদের উন্নতি ও স্বাধীনতার পথে এগিয়ে যেতে হবে।

**Cited:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা (part 2)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q23 · out-of-scope · REFUSED (correct)

**Question:** শবে মেরাজের রাতে কী কী আমল করা উচিত?

**Should come from:** nothing, the blog has no answer

**Mode:** no_answer_in_sources, top score 0.703

**Closest articles:** পবিত্র শবে বরাতে মুমিনদের করণীয়; ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?; যে বিপ্লবে নায়কেরা একে অপরের হাতে প্রাণ হারিয়েছিলেন

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q24 · out-of-scope · REFUSED (correct)

**Question:** ওসমানীয় সাম্রাজ্যের পতন কবে হয়েছিল?

**Should come from:** nothing, the blog has no answer

**Mode:** no_answer_in_sources, top score 0.649

**Closest articles:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?; ইউরোপে ৭৮১ বছরের মুসলিম শাসন; বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q25 · out-of-scope · REFUSED (correct)

**Question:** ১৯৭১ সালের ২৫ মার্চ রাতে ঢাকায় কী ঘটেছিল?

**Should come from:** nothing, the blog has no answer

**Mode:** no_answer_in_sources, top score 0.631

**Closest articles:** যে বিপ্লবে নায়কেরা একে অপরের হাতে প্রাণ হারিয়েছিলেন; যে নদী হয়েছিল রক্ত গঙ্গা; বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q26 · out-of-scope · REFUSED (correct)

**Question:** ঢাকা বিশ্ববিদ্যালয় কবে প্রতিষ্ঠিত হয়েছিল?

**Should come from:** nothing, the blog has no answer

**Mode:** unrelated, top score 0.569

**Closest articles:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা; ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q27 · out-of-scope · REFUSED (correct)

**Question:** বঙ্গভঙ্গের সময় পূর্ব বাংলায় মুসলমানদের স্কুল-কলেজের অবস্থা কেমন ছিল?

**Should come from:** nothing, the blog has no answer

**Mode:** no_answer_in_sources, top score 0.717

**Closest articles:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা; ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?; যে নদী হয়েছিল রক্ত গঙ্গা

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q28 · direct · OK

**Question:** বাংলাদেশে ৭ নভেম্বর কোন দিবস হিসেবে পালিত হয়?

**Should come from:** যে বিপ্লবে নায়কেরা একে অপরের হাতে প্রাণ হারিয়েছিলেন

**Mode:** answered, top score 0.732

**Answer:** বাংলাদেশে ৭ নভেম্বর জাতীয় বিপ্লব ও সংহতি দিবস হিসেবে পালিত হয়। এটি বাংলাদেশের রাজনৈতিক ও সামরিক ইতিহাসের একটি স্মরণীয় ও তাৎপর্যপূর্ণ দিন।

**Cited:** যে বিপ্লবে নায়কেরা একে অপরের হাতে প্রাণ হারিয়েছিলেন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q29 · cross-lingual · OK

**Question:** Who was freed from house arrest in the army uprising on the night of 6 November 1975?

**Should come from:** যে বিপ্লবে নায়কেরা একে অপরের হাতে প্রাণ হারিয়েছিলেন

**Mode:** answered, top score 0.680

**Answer:** ১৯৭৫ সালের ৬ নভেম্বর মধ্যরাতে সেনাবাহিনীর বিদ্রোহের পর তৎকালীন সেনাপ্রধান জিয়াউর রহমানকে গৃহবন্দী দশা থেকে মুক্ত করা হয়।

**Cited:** যে বিপ্লবে নায়কেরা একে অপরের হাতে প্রাণ হারিয়েছিলেন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q30 · direct · OK

**Question:** ভারতের মাটিতে প্রথমবার সফল মুসলিম অভিযানের নেতৃত্ব কার হাতে ছিল?

**Should come from:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.754

**Answer:** ভারতের মাটিতে মুহাম্মদ বিন কাসিমের নেতৃত্বে প্রথমবারের মতো মুসলিম যোদ্ধাদের সফল পদার্পণ ঘটেছিল।

**Cited:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q31 · digits · OK

**Question:** 1526 সালে ইব্রাহিম লোদিকে কে পরাজিত করেন?

**Should come from:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.647

**Answer:** ১৫২৬ সালে পানিপথের প্রথম যুদ্ধে বাবর ইব্রাহিম লোদিকে পরাজিত করেন।

**Cited:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 2)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q32 · mixed · OK

**Question:** Mughal সাম্রাজ্যের আনুষ্ঠানিক সমাপ্তি কবে ঘটে?

**Should come from:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.731

**Answer:** ১৮৫৮ সালের ১ নভেম্বর ভারত শাসন আইন পাস হওয়ার মাধ্যমে মুঘল সাম্রাজ্যের আইনি ও আনুষ্ঠানিক বিলুপ্তি ঘটে।

**Cited:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 3)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q33 · multi-article · OK

**Question:** উমাইয়া খলিফা আল-ওয়ালিদের সময়ে কোন কোন অঞ্চলে মুসলিম বাহিনী অভিযান চালায়?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান + ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.676

**Answer:** উমাইয়া খলিফা আল-ওয়ালিদ বিন আব্দুল মালিকের শাসনামলে মুসলিম বাহিনী স্পেন এবং ভারতীয় উপমহাদেশে অভিযান পরিচালনা করে। ৭১১ খ্রিস্টাব্দে তারিক বিন জিয়াদ স্পেন জয় করেন এবং ৭১২ খ্রিস্টাব্দে মুহাম্মদ বিন কাসিমের নেতৃত্বে সিন্ধু অঞ্চলে সফল অভিযান পরিচালিত হয়।

**Cited:** তারিক বিন জিয়াদের সাহসী অভিযান (part 1); ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q34 · multi-article · OK

**Question:** ইউরোপে আর ভারতে মুসলিম শাসন কত বছর টিকেছিল?

**Should come from:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন + ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.723

**Answer:** ইউরোপে মুসলিম শাসন প্রায় ৭৮১ বছর স্থায়ী ছিল। অন্যদিকে, ভারতীয় উপমহাদেশে মুসলিম শাসন ৭১২ খ্রিস্টাব্দ থেকে ১৮৫৮ সাল পর্যন্ত প্রায় ১১৪৬ বছর স্থায়ী ছিল।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1); ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 4); ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q35 · out-of-scope · REFUSED (correct)

**Question:** আকবরের দীন-ই-ইলাহি কী ছিল?

**Should come from:** nothing, the blog has no answer

**Mode:** unrelated, top score 0.581

**Closest articles:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?; পবিত্র শবে বরাতে মুমিনদের করণীয়

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q36 · out-of-scope · REFUSED (correct)

**Question:** ১৯৭৫ সালের ১৫ আগস্টের হত্যাকাণ্ডের বিচার কবে হয়েছিল?

**Should come from:** nothing, the blog has no answer

**Mode:** no_answer_in_sources, top score 0.687

**Closest articles:** যে বিপ্লবে নায়কেরা একে অপরের হাতে প্রাণ হারিয়েছিলেন; যে নদী হয়েছিল রক্ত গঙ্গা; ফেলানী হত্যার বিচার কই

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:
