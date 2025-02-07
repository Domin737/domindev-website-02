import { useState } from "react";
import "./FAQ.scss";

const FAQ = () => {
  const faqs = [
    {
      question: "Jak długo trwa stworzenie strony WordPress?",
      answer:
        "Czas realizacji zależy od złożoności projektu. Standardowa strona firmowa zajmuje około 2-3 tygodnie, bardziej rozbudowane projekty mogą zająć 4-8 tygodni. Dokładny termin ustalam indywidualnie po analizie wymagań.",
    },
    {
      question: "Czy pomagasz w hostingu i domenie?",
      answer:
        "Tak, oferuję kompleksową pomoc w wyborze i konfiguracji hostingu oraz domeny. Doradzam sprawdzone rozwiązania i pomagam w procesie zakupu i konfiguracji.",
    },
    {
      question: "Czy wykonujesz też modyfikacje istniejących stron?",
      answer:
        "Tak, zajmuję się modyfikacją i rozbudową istniejących stron WordPress. Mogę wprowadzić nowe funkcjonalności, poprawić wydajność lub odświeżyć design.",
    },
    {
      question: "Jakie są koszty stworzenia strony WordPress?",
      answer:
        "Koszt strony zależy od jej funkcjonalności i złożoności. Każdą wycenę przygotowuję indywidualnie po poznaniu szczegółów projektu. Oferuję konkurencyjne ceny i różne pakiety współpracy.",
    },
    {
      question: "Czy zapewniam wsparcie po zakończeniu projektu?",
      answer:
        "Tak, oferuję różne pakiety wsparcia technicznego po wdrożeniu. Obejmują one aktualizacje WordPress, wtyczek, kopie zapasowe i bieżące modyfikacje.",
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="section faq">
      <div className="container">
        <h2>Często Zadawane Pytania</h2>
        <div className="faq__grid">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq__item ${
                openIndex === index ? "faq__item--open" : ""
              }`}
              onClick={() => toggleFAQ(index)}
            >
              <div className="faq__question">
                <h3>{faq.question}</h3>
                <span className="faq__icon"></span>
              </div>
              <div className="faq__answer">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQ;
