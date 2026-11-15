import React, { useState } from 'react';
import { Feather, Heart, RotateCw } from 'lucide-react';

const LETTER_PARAGRAPHS: readonly string[] = [
  'I’m not much of a letter person if I’m honest — I’ve never seemed to be able to put the words down quite right.',
  'Having rewritten this a few times, I think I’m eventually happy with it!',
  'Your letter from way back at 10 months inspired me to do 2 things. To give you your own set of “Reasons” and it prompted me to write you this letter.',
  'When I started looking for love way back in January 21 I was frankly terrified. I think I’d resigned myself to the fact that I would never find what I was hoping for.',
  'I didn’t plan on quitting, I just didn’t have any hope left…. and then there was You.',
  'I remember feeling so excited and nervous at our first meeting. Our chats up until then had pushed my expectations WAY up high and you exceeded EVERY last one of them from the very start ….. effortlessly.',
  'I remember your big smile on that first night we met and I loved how passionately you kissed.',
  'If I’m totally honest I knew at that point that I wasn’t planning on letting you go.',
  'It’s been a whirlwind ever since!',
  'I wanted to do the 50 Reasons in order to help me convey just how unbelievable you truly are.',
  'Even then I genuinely don’t have the words to describe the ways in which I feel wanted, desired, cared for and loved by you. I live with the constant fear that one day I’m gonna be punkd!',
  'They say that if something is too good to be true then it usually is.',
  'But you my darling are the best possible example of an exception to that rule.',
  'I don’t know if I truly deserve you or if so, what the hell I did to get so lucky but I’ll take it.',
  'The past 19 months have been unbelievable. So many memories made, adventures completed and challenges overcome. The living apart is challenging but it won’t be forever and I have no doubt that we’ll handle this obstacle like every other - together!',
  'I never thought I’d be sitting here now contemplating the rest of my life with another woman but I’m so very grateful to say that I am.',
  'You have been an absolute constant in my life for the past 19 months and you have no idea how much that means to me. You have my word that you will always “get as much as you give” in our relationship.',
  'It makes me so very proud to be able to call you mine.',
];

export const ProposalLetterView: React.FC = () => {
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  return (
    <section className="mx-auto max-w-2xl pb-14 pt-2 sm:pt-4">
      {/* Warm Cream Heirloom Cotton Letter Sheet */}
      <article
        aria-label="Proposal letter to Jen"
        className="animate-first-card relative mx-auto rounded-2xl border border-[#D3BC97] bg-[#F6EBD8] p-6 sm:p-11 md:p-14 shadow-[0_20px_52px_rgba(36,24,14,0.18)] dark:border-[#B59469] dark:bg-[#F3E5CE] dark:shadow-[0_24px_60px_rgba(0,0,0,0.68)] paper-grain-white"
      >
        {/* Subtle Warm Cream Vignette & Inner Engraved Frame Line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,rgba(255,250,240,0.45)_0%,rgba(218,190,148,0.22)_100%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-2.5 sm:inset-4 rounded-xl border border-[#C2A070]/45"
        />

        {/* Ringed Quill Crest at Top of Letter */}
        <div className="relative flex flex-col items-center pb-6 sm:pb-8 border-b border-[#D5BF9D]/80">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#B37336]/65 bg-[#EFE0C6] text-[#9E561E] shadow-inner">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-1 rounded-full border border-[#B37336]/35"
            />
            <Feather className="h-5 w-5" />
          </div>
          <span className="mt-2.5 font-mono-tabular text-[11px] tracking-[0.22em] uppercase text-[#6E5338]">
            50 Reasons · And One More
          </span>
        </div>

        {/* Salutation */}
        <div className="relative mt-7 sm:mt-9">
          <p className="font-handwriting text-3xl sm:text-4xl text-[#261B12]">
            Jen,
          </p>
        </div>

        {/* Letter Body on Warm Cream Paper */}
        <div className="relative mt-5 space-y-5 font-handwriting text-[20px] sm:text-[22px] leading-[1.65] text-[#2D2117]">
          {LETTER_PARAGRAPHS.map((paragraph, index) => {
            const isStandoutLine =
              index === 4 || index === 8 || index === LETTER_PARAGRAPHS.length - 1;
            return (
              <p
                key={index}
                className={
                  isStandoutLine
                    ? 'text-[#1F150E] font-bold py-0.5'
                    : ''
                }
              >
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Sign-off */}
        <div className="relative mt-9 pt-6 border-t border-[#D5BF9D]/80 flex flex-col items-end text-right">
          <p className="font-handwriting text-xl sm:text-2xl text-[#664C34]">
            Always &amp; forever,
          </p>
          <p className="mt-1 font-handwriting text-3xl sm:text-4xl text-[#9E561E]">
            Alan
          </p>
        </div>

        {/* Card 51 Resting Directly on the Foot of the Letter */}
        <div className="relative mt-8 pt-8 border-t border-dashed border-[#C8A97E]/75">
          <div className="mx-auto max-w-[460px]">
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsCardFlipped((prev) => !prev)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsCardFlipped((prev) => !prev);
                }
              }}
              aria-label={
                isCardFlipped
                  ? 'Card 51 message shown. Tap to flip back to 51.'
                  : 'Card 51. Tap to flip and read the message.'
              }
              className="tag-perspective group relative w-full cursor-pointer select-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A65E22] rounded-2xl"
            >
              <div className={`tag-flip-inner grid ${isCardFlipped ? 'is-flipped' : ''}`}>
                {/* FRONT FACE: "51" Emblem */}
                <div
                  aria-hidden={isCardFlipped}
                  className="tag-face col-start-1 row-start-1 flex flex-col w-full"
                >
                  {/* Linen Twine Loop */}
                  <div className="pointer-events-none mx-auto -mb-2.5 z-10 flex flex-col items-center">
                    <svg
                      width="36"
                      height="19"
                      viewBox="0 0 34 18"
                      fill="none"
                      aria-hidden="true"
                      className="text-[#8E6D45]"
                    >
                      <path
                        d="M17 17 C12 9, 10 2, 17 1.5 C24 2, 22 9, 17 17"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Chamfered Tag Shoulders with Burnished Brass Eyelet */}
                  <div className="relative flex w-full items-stretch h-[22px] shrink-0">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      className="shrink-0 block"
                      aria-hidden="true"
                    >
                      <polygon points="22,0 22,22 0,22" className="fill-[#FBF7EE]" />
                      <line
                        x1="0"
                        y1="22"
                        x2="22"
                        y2="0"
                        strokeWidth="1.3"
                        className="stroke-[#C89D66]"
                      />
                    </svg>

                    <div className="flex-1 border-t border-[#C89D66] bg-[#FBF7EE] paper-grain-white relative flex items-center justify-center">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-3.5 w-3.5 rounded-full border-2 border-[#A65E22] bg-[#F6EBD8] shadow-inner"
                      />
                    </div>

                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      className="shrink-0 block"
                      aria-hidden="true"
                    >
                      <polygon points="0,0 22,22 0,22" className="fill-[#FBF7EE]" />
                      <line
                        x1="0"
                        y1="0"
                        x2="22"
                        y2="22"
                        strokeWidth="1.3"
                        className="stroke-[#C89D66]"
                      />
                    </svg>
                  </div>

                  {/* Front Body: Large 51 */}
                  <div className="relative flex flex-col justify-between border-x border-b border-[#C89D66] rounded-b-2xl bg-[#FBF7EE] px-6 sm:px-8 pb-4 pt-3 h-[230px] shadow-[0_14px_28px_rgba(36,24,14,0.16)] paper-grain-white">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2.5 bottom-2.5 top-1 rounded-xl border border-[#C89D66]/40"
                    />

                    <div className="relative flex items-center justify-center gap-1.5 text-xs text-[#8C5828]">
                      <Heart className="h-3 w-3 fill-current" />
                      <span className="font-handwriting text-[15px]">From Him</span>
                    </div>

                    <div className="relative my-auto flex flex-col items-center justify-center">
                      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#C89D66]/70 bg-[#F6EBD8]/70 shadow-inner">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-1.5 rounded-full border border-[#C89D66]/35"
                        />
                        <span className="font-handwriting text-5xl sm:text-6xl font-bold text-[#9E561E] leading-none pt-1">
                          51
                        </span>
                      </div>
                    </div>

                    <div className="relative flex items-center justify-center border-t border-[#D5BF9D]/75 pt-2 text-xs text-[#8C5828]">
                      <span className="inline-flex items-center gap-1.5 font-handwriting text-[16px] group-hover:text-[#A65E22] transition-colors">
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>Tap to turn over</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* BACK FACE: Revealed Proposal Quote when Flipped */}
                <div
                  aria-hidden={!isCardFlipped}
                  className="tag-face tag-face-back col-start-1 row-start-1 flex flex-col w-full"
                >
                  {/* Linen Twine Loop */}
                  <div className="pointer-events-none mx-auto -mb-2.5 z-10 flex flex-col items-center">
                    <svg
                      width="36"
                      height="19"
                      viewBox="0 0 34 18"
                      fill="none"
                      aria-hidden="true"
                      className="text-[#8E6D45]"
                    >
                      <path
                        d="M17 17 C12 9, 10 2, 17 1.5 C24 2, 22 9, 17 17"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Chamfered Tag Shoulders with Burnished Brass Eyelet */}
                  <div className="relative flex w-full items-stretch h-[22px] shrink-0">
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      className="shrink-0 block"
                      aria-hidden="true"
                    >
                      <polygon points="22,0 22,22 0,22" className="fill-[#FBF7EE]" />
                      <line
                        x1="0"
                        y1="22"
                        x2="22"
                        y2="0"
                        strokeWidth="1.3"
                        className="stroke-[#C89D66]"
                      />
                    </svg>

                    <div className="flex-1 border-t border-[#C89D66] bg-[#FBF7EE] paper-grain-white relative flex items-center justify-center">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-3.5 w-3.5 rounded-full border-2 border-[#A65E22] bg-[#F6EBD8] shadow-inner"
                      />
                    </div>

                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      className="shrink-0 block"
                      aria-hidden="true"
                    >
                      <polygon points="0,0 22,22 0,22" className="fill-[#FBF7EE]" />
                      <line
                        x1="0"
                        y1="0"
                        x2="22"
                        y2="22"
                        strokeWidth="1.3"
                        className="stroke-[#C89D66]"
                      />
                    </svg>
                  </div>

                  {/* Back Body: The Proposal Quote */}
                  <div className="relative flex flex-col justify-between border-x border-b border-[#C89D66] rounded-b-2xl bg-[#FBF7EE] px-6 sm:px-8 pb-4 pt-3 h-[230px] shadow-[0_14px_28px_rgba(36,24,14,0.16)] paper-grain-white">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-2.5 bottom-2.5 top-1 rounded-xl border border-[#C89D66]/40"
                    />

                    <div className="relative flex items-center justify-center gap-1.5 text-xs text-[#8C5828]">
                      <Heart className="h-3 w-3 fill-current" />
                      <span className="font-handwriting text-[15px]">Card 51</span>
                    </div>

                    <div className="relative my-auto flex items-center justify-center py-3 px-2 ruled-stationery-light rounded-xl">
                      <p className="font-handwriting text-[22px] sm:text-[26px] leading-[1.42] text-center text-[#241B13]">
                        “I may not have been your first...
                        <br />
                        but let me be your last....”
                      </p>
                    </div>

                    <div className="relative flex items-center justify-center border-t border-[#D5BF9D]/75 pt-2 text-xs text-[#8C5828]">
                      <span className="inline-flex items-center gap-1.5 font-handwriting text-[15px] opacity-80">
                        <RotateCw className="h-3 w-3" />
                        <span>Flip back</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
};
