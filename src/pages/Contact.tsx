import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import "./Contact.css";

type ContactForm = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type ContactErrors = Partial<Record<keyof ContactForm, string>>;

type FaqItem = {
  question: string;
  answer: string;
};

const contactDetails = [
  {
    label: "CUSTOMER CARE",
    detail: "For questions about orders, products and delivery.",
    value: "leaflydatabase@gmail.com",
    type: "email",
  },
  {
    label: "EMAIL",
    detail: "leaflydatabase@gmail.com",
    value: "leaflydatabase@gmail.com",
    type: "email",
  },
  {
    label: "TEA GUIDANCE",
    detail: "Need help choosing a tea? Tell us what you enjoy and we'll help.",
    value: "leaflydatabase@gmail.com",
    type: "guidance",
  },
];

const faqItems: FaqItem[] = [
  {
    question: "How can I get help choosing a tea?",
    answer:
      "Tell us what kind of tea you usually enjoy, the mood you want, or the time of day you plan to drink it. We can suggest a few leaves that match your taste and routine.",
  },
  {
    question: "Where can I ask about my order?",
    answer:
      "Send a note through the form below with your order details and we’ll guide you through any delivery, product, or timing questions you may have.",
  },
  {
    question: "How quickly will I receive a response?",
    answer:
      "We aim to reply as soon as possible, generally within one to two business days depending on volume and seasonal inquiries.",
  },
  {
    question: "Can I ask about a specific tea?",
    answer:
      "Absolutely. Mention the tea name, the tasting notes you’re looking for, or the cup you prefer, and we’ll help point you toward the right selection.",
  },
];

const initialForm: ContactForm = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

import { ApiService } from "../lib/apiClient";

export default function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ContactForm>(initialForm);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: undefined,
    }));

    if (isSubmitted) {
      setIsSubmitted(false);
    }
  };

  const validateForm = () => {
    const nextErrors: ContactErrors = {};

    if (!formData.name.trim()) {
      nextErrors.name = "Please enter your name.";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Please enter your email address.";
    } else if (!emailRegex.test(formData.email.trim())) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!formData.subject.trim()) {
      nextErrors.subject = "Please enter a subject.";
    }

    if (!formData.message.trim()) {
      nextErrors.message = "Please enter your message.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setIsSubmitted(false);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const res = await ApiService.submitContactInquiry(formData);
      if (res.success) {
        setIsSubmitted(true);
        setReferenceId(res.referenceId || null);
        setFormData(initialForm);
      } else {
        setSubmitError(res.error || "We couldn't send your message right now. Please try again.");
      }
    } catch (err: unknown) {
      console.error("Error submitting contact form:", err);
      setSubmitError("We couldn't send your message right now. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <div className="contact-hero-copy">
          <p className="contact-eyebrow">CONTACT LEAFLY</p>
          <h1>
            Let&apos;s talk
            <span>about tea.</span>
          </h1>
          <p className="contact-hero-text">
            Questions about an order, choosing a tea, or simply want to say hello? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      <section className="contact-info">
        <div className="contact-info-grid">
          {contactDetails.map((item) => (
            <article key={item.label} className="contact-card">
              <p className="contact-card-label">{item.label}</p>
              <h2>{item.detail}</h2>
              {item.label === "EMAIL" ? (
                <a href={`mailto:${item.value}`} className="contact-link">
                  {item.value}
                </a>
              ) : (
                <p className="contact-card-meta">{item.value}</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="contact-panel">
        <div className="contact-form-wrap">
          <div className="contact-panel-header">
            <p className="contact-eyebrow">WRITE TO US</p>
            <h2>Send a note.</h2>
          </div>

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="field-row">
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && <small>{errors.name}</small>}
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.email)}
                />
                {errors.email && <small>{errors.email}</small>}
              </label>
            </div>

            <label className="field">
              <span>Subject</span>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                aria-invalid={Boolean(errors.subject)}
              />
              {errors.subject && <small>{errors.subject}</small>}
            </label>

            <label className="field">
              <span>Message</span>
              <textarea
                name="message"
                rows={6}
                value={formData.message}
                onChange={handleChange}
                aria-invalid={Boolean(errors.message)}
              />
              {errors.message && <small>{errors.message}</small>}
            </label>

            {submitError && (
              <p className="contact-field-error" style={{ color: "#e53e3e", fontSize: "14px", marginTop: "10px" }}>
                {submitError}
              </p>
            )}

            <div className="form-actions">
              <button type="submit" className="contact-submit" disabled={isSubmitting}>
                {isSubmitting ? "SENDING..." : "SEND MESSAGE"}
              </button>
            </div>

            {isSubmitted && (
              <div className="form-success" style={{ marginTop: "16px", padding: "14px", background: "rgba(11, 43, 30, 0.06)", borderLeft: "3px solid #c9a24b", borderRadius: "4px" }}>
                <strong style={{ display: "block", color: "#0b2b1e", marginBottom: "4px" }}>Message Received 🍃</strong>
                <p style={{ margin: "0 0 6px", fontSize: "14px" }}>
                  Thank you for reaching out to Leafly. A confirmation has been sent to your email.
                </p>
                {referenceId && (
                  <span style={{ fontSize: "13px", color: "#c9a24b", fontWeight: 600 }}>
                    Reference ID: #{referenceId}
                  </span>
                )}
              </div>
            )}
          </form>
        </div>

        <aside className="faq-wrap">
          <div className="faq-header">
            <p className="contact-eyebrow">FAQ</p>
            <h2>Helpful answers.</h2>
          </div>

          <div className="faq-list">
            {faqItems.map((item, index) => {
              const isOpen = openFaq === index;

              return (
                <div key={item.question} className={`faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.question}</span>
                    <span className="faq-plus">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && <p className="faq-answer">{item.answer}</p>}
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      <section className="contact-cta">
        <p className="contact-eyebrow">READY TO EXPLORE?</p>
        <h2>Find your next ritual.</h2>
        <button type="button" className="contact-cta-button" onClick={() => navigate("/shop")}>
          EXPLORE THE TEA COLLECTION
        </button>
      </section>

      <button type="button" className="back-to-top" onClick={handleBackToTop} aria-label="Back to top">
        ↑
      </button>
      <Footer />
    </main>
  );
}
