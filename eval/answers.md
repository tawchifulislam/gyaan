# Answer evaluation

Generator `gemini:gemini-3.1-flash-lite`, embeddings `gemini:gemini-embedding-001`, retrieval gate 0.6, 2026-11-24.

The checks below are automatic: they say whether the system answered, from which article, or refused. **They cannot say whether an answer is true.** Read every answer and mark it in the "Your verdict" line.

## Answerable questions

| Result | Count |
| --- | --- |
| Answered, cited every needed article | 28 of 28 (100%) |
| Answered, cited only some needed articles | 0 |
| Answered, but cited the wrong article | 0 |
| Wrongly refused | 0 |
| Errors | 0 |
| Answer written in the wrong language | 0 |

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

33 generation request(s), 73562 input and 1971 output tokens in total. Median 8.8 s per question, slowest 60.2 s.

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

**Answer:** একাত্তরের চুকনগর গণহত্যার প্রত্যক্ষদর্শী হিসেবে সিরাজুল ইসলাম, নিমাই চন্দ্র রায় এবং চুকনগর কলেজের সাবেক অধ্যক্ষ এবিএম শফিকুল ইসলাম কথা বলেছেন। তারা এই নির্মম হত্যাকাণ্ডের বিভিন্ন দিক ও ভয়াবহ পরিস্থিতির বর্ণনা দিয়েছেন।

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

**Answer:** ২০১৩ সালের ৬ সেপ্টেম্বর বিএসএফ-এর বিশেষ আদালত ফেলানী হত্যার অভিযোগে অভিযুক্ত বিএসএফ সদস্য অমিয় ঘোষকে বেকসুর খালাস প্রদান করে।

**Cited:** ফেলানী হত্যার বিচার কই (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q05 · direct · OK

**Question:** শবে বরাতের রাতে আলোর সাজ, আতশবাজি আর হালুয়া-রুটি নিয়ে লেখকের মত কী?

**Should come from:** পবিত্র শবে বরাতে মুমিনদের করণীয়

**Mode:** answered, top score 0.705

**Answer:** শবে বরাত উপলক্ষে আলোকসজ্জা, আতশবাজি বা হালুয়া-রুটি নিয়ে মেতে ওঠার মতো কোনো ভিত্তি ইসলামে নেই। লেখকের মতে, এই ধরনের কর্মকাণ্ড বর্জনীয় এবং ইবাদত হতে হবে একান্ত ও বিনম্র।

**Cited:** পবিত্র শবে বরাতে মুমিনদের করণীয় (part 2)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q06 · direct · OK

**Question:** আল-আন্দালুস নামটা কোথা থেকে এসেছে বলে মনে করা হয়?

**Should come from:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন

**Mode:** answered, top score 0.668

**Answer:** আল-আন্দালুস নামটি কোথা থেকে এসেছে তা নিয়ে বিভিন্ন মত রয়েছে। তবে সবচেয়ে প্রচলিত ধারণা হলো, এটি প্রাচীন ভ্যান্ডাল গোত্রের নাম থেকে এসেছে, যারা পঞ্চম শতাব্দীতে এই অঞ্চলে সংক্ষিপ্ত সময়ের জন্য শাসন করেছিল।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q07 · direct · OK

**Question:** বঙ্গভঙ্গের পর গঠিত নতুন প্রদেশে প্রথম লেফটেন্যান্ট গভর্নর হিসেবে কে বসেন?

**Should come from:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা

**Mode:** answered, top score 0.712

**Answer:** ১৯০৫ সালে বঙ্গভঙ্গ কার্যকর হওয়ার পর নবগঠিত প্রদেশের লেফটেন্যান্ট গভর্নর হিসেবে স্যার ব্যামফিল্ড ফুলার নিযুক্ত হন।

**Cited:** বঙ্গভঙ্গ ও মুসলমানদের শিক্ষা (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q08 · cross-lingual · OK

**Question:** How many Bangladeshis did the Indian border force kill in 2023, according to the blog?

**Should come from:** ফেলানী হত্যার বিচার কই

**Mode:** answered, top score 0.727

**Answer:** According to the blog, 31 Bangladeshis were killed by the BSF in 2023.

**Cited:** ফেলানী হত্যার বিচার কই (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q09 · cross-lingual · OK

**Question:** Why did thousands of people gather at Chuknagar in May 1971?

**Should come from:** যে নদী হয়েছিল রক্ত গঙ্গা

**Mode:** answered, top score 0.708

**Answer:** In May 1971, thousands of people gathered at Chuknagar because it was considered a relatively safe area from which it was easy to cross the border into India. Refugees from districts like Khulna, Bagerhat, Faridpur, and Barishal arrived there hoping to find safety and escape the conflict.

**Cited:** যে নদী হয়েছিল রক্ত গঙ্গা (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q10 · cross-lingual · OK

**Question:** What does the word Shab-e-Barat mean?

**Should come from:** পবিত্র শবে বরাতে মুমিনদের করণীয়

**Mode:** answered, top score 0.730

**Answer:** Shab-e-Barat is a Persian term where 'Shab' means night and 'Barat' means salvation or destiny.

**Cited:** পবিত্র শবে বরাতে মুমিনদের করণীয় (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q11 · cross-lingual · OK

**Question:** Why did Tariq ibn Ziyad burn his ships?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান

**Mode:** answered, top score 0.670

**Answer:** Tariq ibn Ziyad ordered his ships to be burned because his soldiers were intimidated by the size of the enemy army. He wanted to eliminate any possibility of retreat, leaving his troops with only two choices: to fight and achieve victory or to attain martyrdom.

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

**Answer:** দশম শতাব্দীর কর্ডোবা শহরটি ইউরোপের অন্যতম বৃহত্তম ও উন্নত শহর ছিল, যেখানে একটি বিশাল গ্রন্থাগার ও জ্ঞানচর্চার কেন্দ্র বিদ্যমান ছিল। এই কেন্দ্র থেকে গ্রিক-রোমান, ভারতীয় ও পারস্য জ্ঞান সংরক্ষিত ও অনুবাদ করা হতো। এই জ্ঞানচর্চার ফলে চিকিৎসা, দর্শন, গণিত, জ্যোতির্বিজ্ঞান, স্থাপত্য ও সাহিত্যে অভূতপূর্ব অগ্রগতি ঘটেছিল, যা পরবর্তীকালে ইউরোপে নবজাগরণের সূচনায় সহায়তা করে।

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

**Answer:** স্পেনে মুসলিম শাসন শুরু করেছিলেন সেনাপতি তারিক বিন জিয়াদ। ৭১১ খ্রিস্টাব্দে শুরু হওয়া এই শাসন ১৪৯২ সালে গ্রানাডার পতনের মাধ্যমে শেষ হয়, যা প্রায় ৭৮১ বছর স্থায়ী ছিল।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1); তারিক বিন জিয়াদের সাহসী অভিযান (part 1); তারিক বিন জিয়াদের সাহসী অভিযান (part 2)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q16 · multi-article · OK

**Question:** গথ রাজা রডারিক কীভাবে পরাজিত হলেন, আর মুসলিম শাসিত স্পেনের শেষটা কীভাবে হয়েছিল?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান + ইউরোপে ৭৮১ বছরের মুসলিম শাসন

**Mode:** answered, top score 0.731

**Answer:** গথ রাজা রডারিক ওয়াদি লাক্কার যুদ্ধে মুসলিম বাহিনীর কাছে পরাজিত হন এবং পালানোর সময় নিহত হন। স্পেনে মুসলিম শাসনের শেষ হয় ১৪৯২ সালে গ্রানাডা আমিরাতের পতনের মাধ্যমে।

**Cited:** তারিক বিন জিয়াদের সাহসী অভিযান (part 2); ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q17 · multi-article · OK

**Question:** ভারতীয় সীমান্তের কাছে সাধারণ মানুষ নিহত হওয়ার কোন কোন ঘটনা ব্লগে আছে?

**Should come from:** ফেলানী হত্যার বিচার কই + যে নদী হয়েছিল রক্ত গঙ্গা

**Mode:** answered, top score 0.724

**Answer:** ব্লগে ভারতীয় সীমান্তের কাছে সাধারণ মানুষ নিহত হওয়ার দুটি প্রধান ঘটনার উল্লেখ রয়েছে। প্রথমটি হলো ২০১১ সালের ৭ জানুয়ারি কুড়িগ্রামের ফুলবাড়ী সীমান্তে বিএসএফ সদস্যের গুলিতে ফেলানী খাতুনের হত্যাকাণ্ড। দ্বিতীয়টি হলো ১৯৭১ সালের ২০ মে খুলনার ডুমুরিয়ায় চুকনগর গণহত্যা, যেখানে ভারত সীমান্তের কাছাকাছি অবস্থানরত হাজার হাজার শরণার্থীকে পাকিস্তানি বাহিনী নির্বিচারে গুলি করে হত্যা করেছিল।

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

**Answer:** ইউরোপে মুসলিম শাসন ৭১১ খ্রিস্টাব্দে শুরু হয় এবং ১৪৯২ খ্রিস্টাব্দে গ্রানাডার পতনের মাধ্যমে শেষ হয়। এই শাসনকাল মোটামুটি ৭৮১ বছর স্থায়ী ছিল।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q20 · digits · OK

**Question:** চুকনগরে নিহতের সংখ্যা 10 থেকে 12 হাজার, এই হিসাব কাদের?

**Should come from:** যে নদী হয়েছিল রক্ত গঙ্গা

**Mode:** answered, top score 0.757

**Answer:** চুকনগর গণহত্যার প্রত্যক্ষদর্শী এবং যারা লাশ নদীতে ফেলেছিল, তাদের মতে নিহতের সংখ্যা প্রায় ১০ থেকে ১২ হাজার বা তার কম-বেশি।

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

**Answer:** বঙ্গভঙ্গ রদ হওয়ার পর মুসলমানরা বুঝতে পারে যে ব্রিটিশ বা হিন্দুদের দ্বারা তাদের স্বার্থ সংরক্ষিত হবে না। তারা উপলব্ধি করে যে আপস নয়, বরং সংগ্রামের পথ ধরেই তাদের উন্নতি ও স্বাধীনতার পথে অগ্রসর হতে হবে।

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

**Answer:** General Ziaur Rahman was freed from house arrest during the military uprising that took place on the night of 6 November 1975.

**Cited:** যে বিপ্লবে নায়কেরা একে অপরের হাতে প্রাণ হারিয়েছিলেন (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q30 · direct · OK

**Question:** ভারতের মাটিতে প্রথমবার সফল মুসলিম অভিযানের নেতৃত্ব কার হাতে ছিল?

**Should come from:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.754

**Answer:** ৭১২ খ্রিস্টাব্দে মুহাম্মদ বিন কাসিমের নেতৃত্বে প্রথমবারের মতো ভারতের মাটিতে মুসলিম যোদ্ধাদের সফল পদার্পণ ঘটে।

**Cited:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q31 · digits · OK

**Question:** 1526 সালে ইব্রাহিম লোদিকে কে পরাজিত করেন?

**Should come from:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.647

**Answer:** ১৫২৬ সালে পানিপথের প্রথম যুদ্ধে বাবর ইব্রাহিম লোদিকে পরাজিত ও নিহত করেন।

**Cited:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 2)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q32 · mixed · OK

**Question:** Mughal সাম্রাজ্যের আনুষ্ঠানিক সমাপ্তি কবে ঘটে?

**Should come from:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.731

**Answer:** ১৮৫৮ সালের ১ নভেম্বর ভারত শাসন আইন পাস হওয়ার মাধ্যমে মুঘল সাম্রাজ্যের আইনি ও আনুষ্ঠানিক বিলুপ্তি ঘটে। এই আইনের ফলে শেষ সম্রাট বাহাদুর শাহ জাফরকে আনুষ্ঠানিকভাবে ক্ষমতাচ্যুত করা হয়।

**Cited:** ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 3)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q33 · multi-article · OK

**Question:** উমাইয়া খলিফা আল-ওয়ালিদের সময়ে কোন কোন অঞ্চলে মুসলিম বাহিনী অভিযান চালায়?

**Should come from:** তারিক বিন জিয়াদের সাহসী অভিযান + ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.676

**Answer:** উমাইয়া খলিফা আল-ওয়ালিদ বিন আব্দুল মালিকের শাসনামলে মুসলিম বাহিনী স্পেনে এবং ভারতীয় উপমহাদেশে অভিযান পরিচালনা করে। তারিক বিন জিয়াদ ৭১১ খ্রিস্টাব্দে স্পেন অভিযানে নেতৃত্ব দেন এবং মুহাম্মদ বিন কাসিম ৭১২ খ্রিস্টাব্দে ভারতের সিন্ধু অঞ্চলে সফল অভিযান পরিচালনা করেন।

**Cited:** তারিক বিন জিয়াদের সাহসী অভিযান (part 1); ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 1)

**Your verdict:** [ ] correct   [ ] wrong   [ ] partly   notes:

### q34 · multi-article · OK

**Question:** ইউরোপে আর ভারতে মুসলিম শাসন কত বছর টিকেছিল?

**Should come from:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন + ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ?

**Mode:** answered, top score 0.723

**Answer:** ইউরোপে মুসলিম শাসন ৭৮১ বছর টিকেছিল, যা ৭১১ খ্রিস্টাব্দে শুরু হয়ে ১৪৯২ সালে গ্রানাডার পতনের মাধ্যমে শেষ হয়। অন্যদিকে, ভারতীয় উপমহাদেশে মুসলিম শাসন ৭১২ খ্রিস্টাব্দ থেকে ১৮৫৮ সাল পর্যন্ত প্রায় ১১৪৬ বছর স্থায়ী ছিল।

**Cited:** ইউরোপে ৭৮১ বছরের মুসলিম শাসন (part 1); ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 4); ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 1); ১১৪৬ বছর মুসলিম শাসনের পরও কেন মুসলমানরা দুর্বল ? (part 3)

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
