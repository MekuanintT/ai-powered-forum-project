import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  MessageSquare,
  Sparkles,
  Database,
  FileText,
  BookOpen,
  Users,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import styles from "./Landing.module.css";

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const handleLogin = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const features = [
    {
      icon: Search,
      title: "Find Related Work",
      description:
        "Discover questions and discussions that are semantically related to what you are asking.",
    },
    {
      icon: MessageSquare,
      title: "Readable Threads",
      description:
        "Follow clear technical discussions and learn from answers shared by the community.",
    },
    {
      icon: Sparkles,
      title: "Lightweight AI Help",
      description:
        "Get helpful AI feedback while writing questions and evaluating possible answers.",
    },
    {
      icon: Database,
      title: "RAG Over Course Library",
      description:
        "Search and ask questions using information grounded in your uploaded course documents.",
    },
  ];

  const ragSteps = [
    {
      icon: FileText,
      number: "01",
      title: "Ingest & Chunk",
      description:
        "Course documents are processed and divided into smaller meaningful pieces of text.",
    },
    {
      icon: Search,
      number: "02",
      title: "Retrieve at Question Time",
      description:
        "Relevant pieces of information are retrieved when a user searches or asks a question.",
    },
    {
      icon: Sparkles,
      number: "03",
      title: "Grounded Responses",
      description:
        "AI responses can use the retrieved course context to provide more relevant answers.",
    },
  ];

  const howItWorks = [
    {
      number: "01",
      title: "Ask With Context",
      description:
        "Create a technical question and provide enough context for the community and AI tools to understand it.",
    },
    {
      number: "02",
      title: "Get Answers",
      description:
        "Receive answers from other members and use AI assistance when it is available.",
    },
    {
      number: "03",
      title: "Search Two Ways",
      description:
        "Use traditional keyword search or semantic search to find conceptually related questions.",
    },
    {
      number: "04",
      title: "Own Your Trail",
      description:
        "Keep track of your questions, answers, and learning journey inside the forum.",
    },
  ];

  return (
    <div className={styles.landing}>
      {/* Navigation */}
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.navbar}>
            <button
              className={styles.brand}
              onClick={() => navigate("/")}
              aria-label="Go to homepage"
            >
              <span className={styles.brandMark}>E</span>
              <span className={styles.brandText}>Evangadi Forum</span>
            </button>

            <nav className={styles.navLinks}>
              <a href="#overview">Overview</a>
              <a href="#rag">Course RAG</a>
              <a href="#how-it-works">How it works</a>
            </nav>

            <div className={styles.navActions}>
              <button
                className={styles.loginButton}
                onClick={handleLogin}
              >
                {isAuthenticated ? "Dashboard" : "Sign in"}
              </button>

              {!isAuthenticated && (
                <button
                  className={styles.navCta}
                  onClick={handleGetStarted}
                >
                  Create account
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="overview" className={styles.hero}>
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroContent}>
                <span className={styles.eyebrow}>
                  TECHNICAL Q&A · AI-ASSISTED LEARNING
                </span>

                <h1>
                  A calm place for
                  <span> technical Q&A.</span>
                </h1>

                <p className={styles.heroDescription}>
                  Ask focused questions, discover related discussions, and
                  use AI-powered tools to improve the way you learn and share
                  technical knowledge.
                </p>

                <div className={styles.heroActions}>
                  <button
                    className={styles.primaryButton}
                    onClick={handleGetStarted}
                  >
                    {isAuthenticated ? "Go to Dashboard" : "Get started"}
                    <ArrowRight size={18} />
                  </button>

                  <a
                    href="#how-it-works"
                    className={styles.secondaryButton}
                  >
                    See how it works
                  </a>
                </div>

                <div className={styles.heroMeta}>
                  <div className={styles.metaItem}>
                    <CheckCircle2 size={17} />
                    <span>Community driven</span>
                  </div>

                  <div className={styles.metaItem}>
                    <CheckCircle2 size={17} />
                    <span>AI assisted</span>
                  </div>

                  <div className={styles.metaItem}>
                    <CheckCircle2 size={17} />
                    <span>Course aware</span>
                  </div>
                </div>
              </div>

              <div className={styles.heroCard}>
                <div className={styles.heroCardHeader}>
                  <div>
                    <span className={styles.cardLabel}>AT A GLANCE</span>
                    <h2>Learn. Search. Ask.</h2>
                  </div>

                  <div className={styles.heroIcon}>
                    <Sparkles size={22} />
                  </div>
                </div>

                <div className={styles.heroCardContent}>
                  <div className={styles.glanceItem}>
                    <div className={styles.glanceIcon}>
                      <MessageSquare size={19} />
                    </div>
                    <div>
                      <strong>Technical discussions</strong>
                      <p>Ask questions and learn from answers.</p>
                    </div>
                  </div>

                  <div className={styles.glanceItem}>
                    <div className={styles.glanceIcon}>
                      <Search size={19} />
                    </div>
                    <div>
                      <strong>Semantic discovery</strong>
                      <p>Find related questions by meaning.</p>
                    </div>
                  </div>

                  <div className={styles.glanceItem}>
                    <div className={styles.glanceIcon}>
                      <Database size={19} />
                    </div>
                    <div>
                      <strong>Course knowledge</strong>
                      <p>Search information from your documents.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RAG */}
        <section id="rag" className={styles.ragSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <span className={styles.eyebrow}>COURSE RAG</span>
              <h2>Knowledge that stays grounded.</h2>
              <p>
                Upload course material and use retrieval-augmented generation
                to find relevant information before asking the AI for an
                answer.
              </p>
            </div>

            <div className={styles.ragGrid}>
              {ragSteps.map((step, index) => {
                const Icon = step.icon;

                return (
                  <motion.article
                    key={step.number}
                    className={styles.ragCard}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.1,
                    }}
                  >
                    <div className={styles.ragTop}>
                      <span>{step.number}</span>
                      <Icon size={23} />
                    </div>

                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className={styles.featuresSection}>
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <span className={styles.eyebrow}>CAPABILITIES</span>
              <h2>Everything you need to learn together.</h2>
              <p>
                Evangadi Forum combines community discussion with AI-assisted
                tools to make technical learning easier to navigate.
              </p>
            </div>

            <div className={styles.featuresGrid}>
              {features.map((feature, index) => {
                const Icon = feature.icon;

                return (
                  <motion.article
                    key={feature.title}
                    className={styles.featureCard}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      duration: 0.5,
                      delay: index * 0.08,
                    }}
                  >
                    <div className={styles.featureIcon}>
                      <Icon size={23} />
                    </div>

                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>

                    <span className={styles.featureArrow}>
                      <ArrowRight size={17} />
                    </span>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className={styles.howSection}>
          <div className={styles.container}>
            <div className={styles.howGrid}>
              <div className={styles.howIntro}>
                <span className={styles.eyebrow}>HOW IT WORKS</span>

                <h2>
                  From question
                  <span> to understanding.</span>
                </h2>

                <p>
                  The forum keeps the learning process simple: ask a good
                  question, discover useful information, and continue building
                  your knowledge.
                </p>

                <button
                  className={styles.primaryButton}
                  onClick={handleGetStarted}
                >
                  {isAuthenticated ? "Go to Dashboard" : "Join the forum"}
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className={styles.stepsList}>
                {howItWorks.map((step, index) => (
                  <motion.div
                    key={step.number}
                    className={styles.step}
                    initial={{ opacity: 0, x: 25 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{
                      duration: 0.45,
                      delay: index * 0.08,
                    }}
                  >
                    <div className={styles.stepNumber}>{step.number}</div>

                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={styles.ctaCard}>
              <div>
                <span className={styles.eyebrow}>START LEARNING</span>
                <h2>Ready when you are.</h2>
                <p>
                  Join the community, ask your first question, and start
                  building your technical knowledge.
                </p>
              </div>

              <button
                className={styles.ctaButton}
                onClick={handleGetStarted}
              >
                {isAuthenticated ? "Open dashboard" : "Create free account"}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <div className={styles.brand}>
                <span className={styles.brandMark}>E</span>
                <span className={styles.brandText}>Evangadi Forum</span>
              </div>

              <p>
                A community-driven space for technical questions, learning,
                and AI-assisted knowledge discovery.
              </p>
            </div>

            <div className={styles.footerLinks}>
              <a href="#overview">Overview</a>
              <a href="#rag">Course RAG</a>
              <a href="#how-it-works">How it works</a>

              {!isAuthenticated && (
                <button onClick={handleLogin}>Sign in</button>
              )}
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span>© 2026 Evangadi Forum</span>
            <span>Built for collaborative technical learning.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
