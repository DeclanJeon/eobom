const siteUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "https://eobom.ponslink.com";

/** SEO + AEO/GEO structured data (JSON-LD). */
export function JsonLd() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "이어봄",
    alternateName: ["Eobom", "eobom"],
    url: siteUrl,
    logo: `${siteUrl}/icon-512.png`,
    description:
      "흩어진 묵상을 이어, 어제의 믿음이 오늘의 방향이 되게 하는 개인 묵상 기록 서비스",
    parentOrganization: {
      "@type": "Organization",
      name: "PonsLink",
      url: "https://ponslink.com",
    },
    sameAs: [] as string[],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "이어봄",
    alternateName: "Eobom",
    url: siteUrl,
    inLanguage: "ko-KR",
    description:
      "성경 묵상, 큐티, 기도, 결단을 기록하고 AI 회고로 연결하는 개인 묵상 기록지",
    publisher: { "@type": "Organization", name: "이어봄", url: siteUrl },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/entries?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "이어봄",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
    url: siteUrl,
    image: `${siteUrl}/og-image.png`,
    description:
      "개인 묵상 기록, 성구 선택, 익명 나눔, AI 회고를 제공하는 웹 앱",
    inLanguage: "ko-KR",
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "이어봄은 무엇인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "이어봄은 성경 묵상과 큐티, 기도, 결단을 안전하게 기록하고, 과거의 기록을 AI 회고로 다시 연결하는 개인용 묵상 기록 웹 서비스입니다. AI가 신앙을 평가하거나 하나님의 뜻을 판정하지 않습니다.",
        },
      },
      {
        "@type": "Question",
        name: "이어봄 묵상 기록은 공개되나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "기본적으로 모든 묵상 원문은 비공개입니다. 사용자가 원할 때만 별도의 익명 공유본을 만들어 ‘함께’ 피드에 나눌 수 있습니다.",
        },
      },
      {
        "@type": "Question",
        name: "QR 키링은 어떻게 쓰나요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "개인 주소(예: eobom.ponslink.com/j/e01) QR을 스캔한 뒤 Google로 처음 로그인하면 그 주소가 계정에 연결됩니다. 같은 기기에서는 세션이 유지되는 동안 자동으로 식별됩니다.",
        },
      },
      {
        "@type": "Question",
        name: "AI 회고는 어떤 역할인가요?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AI 회고는 사용자가 남긴 기록을 정리한 성찰 초안입니다. 영적 점수를 매기거나 소명을 선언하지 않으며, 기도와 공동체 분별을 대신하지 않습니다.",
        },
      },
    ],
  };

  const payloads = [organization, website, software, faq];

  return (
    <>
      {payloads.map((data, i) => (
        <script
          // eslint-disable-next-line react/no-danger
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
