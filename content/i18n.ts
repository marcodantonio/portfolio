export type Lang = "it" | "en";

type Copy = {
  nav: { about: string; education: string; skills: string; projects: string; experience: string; contact: string };
  hero: {
    badge: string;
    scroll: string;
    chatSub: string;
    chatGreeting: string;
    chatPlaceholder: string;
    chips: string[];
    roles: string[];
    ctaWork: string;
    ctaCV: string;
    chatErrorGeneric: string;
    chatErrorTimeout: string;
    chatErrorOffline: string;
  };
  about: { label: string; title: string; bio: string[]; termTitle: string };
  education: {
    label: string;
    title: string;
    msc: string;
    bsc: string;
    thesis: string;
    ongoing: string;
    done: string;
    distance: string;
    items: Record<"bsc" | "thesis" | "msc", { degree: string; school: string; focus: string; tags: string[] }>;
  };
  skills: { label: string; title: string; hint: string; skills: string; categories: Record<string, string> };
  projects: {
    label: string;
    title: string;
    drag: string;
    scrollHint: string;
    proofLabels: { role: string; output: string };
    items: Array<{ title: string; description: string; proof: { role: string; output: string } }>;
  };
  experience: {
    label: string;
    title: string;
    items: Array<{ date: string; title: string; location: string; description: string }>;
  };
  contact: {
    label: string;
    title: string;
    titleEm: string;
    sub: string;
    email: string;
    message: string;
    command: string;
    send: string;
    sending: string;
    sent: string;
    errorSecurity: string;
    errorGeneric: string;
  };
};

export const dictionary: Record<Lang, Copy> = {
  it: {
    nav: {
      about: "Chi sono",
      education: "Formazione",
      skills: "Competenze",
      projects: "Progetti",
      experience: "Esperienza",
      contact: "Contatto",
    },
    hero: {
      badge: "Software Developer & AI Engineer",
      scroll: "scroll",
      chatSub: "assistente digitale",
      chatGreeting:
        "Ciao! Sono Marco.AI — l'assistente digitale di Marco. Chiedimi della sua esperienza, skill, progetti o disponibilità.",
      chatPlaceholder: "Fai una domanda...",
      chips: ["Raccontami di Marco", "Che skill ha?", "Progetti recenti?", "È disponibile?"],
      roles: ["Software Developer", "AI & Computer Vision", "Infrastructure", "Product Prototyping"],
      ctaWork: "Lavoriamo insieme",
      ctaCV: "Scarica il CV",
      chatErrorGeneric: "Non riesco ad elaborare la richiesta. Riprova.",
      chatErrorTimeout: "Verifica di sicurezza scaduta. Riprova.",
      chatErrorOffline: "Errore di connessione. Riprova!",
    },
    about: {
      label: "Profilo",
      title: "Profilo",
      bio: [
        "Sono Marco, un <strong>Software Developer</strong> con esperienza su web systems, intelligenza artificiale e infrastrutture.",
        "Lavoro in Netsons su funzionalità web, integrazione servizi e automazione del delivery con CI/CD e container.",
        "Mi sono laureato in Informatica all'Università degli Studi dell'Aquila con tesi su computer vision e mixed reality con Apple Vision Pro.",
      ],
      termTitle: "marco@dev — profile.sh",
    },
    education: {
      label: "Formazione",
      title: "Formazione",
      msc: "Magistrale in corso",
      bsc: "Triennale",
      thesis: "Tesi Triennale",
      ongoing: "In corso",
      done: "Completata",
      distance: "TO ↔ AQ · ~550 km",
      items: {
        bsc: {
          degree: "Laurea Triennale in Informatica (100/110)",
          school: "Università degli Studi dell'Aquila — L'Aquila",
          focus: "AI & Machine Learning, Web Technology, Web Engineering, Sviluppo Web Avanzato",
          tags: ["AI/ML", "Web Tech", "Web Engineering", "Java", "Python"],
        },
        thesis: {
          degree: "Tesi Triennale",
          school: "Computer Vision e Mixed Reality",
          focus: "Prototipazione di prodotti con Apple Vision Pro",
          tags: ["Apple Vision Pro", "Computer Vision", "Mixed Reality", "Prototyping"],
        },
        msc: {
          degree: "Laurea Magistrale in Ingegneria Informatica",
          school: "Politecnico di Torino — Torino",
          focus: "Computer Networking & Infrastrutture di Rete",
          tags: ["Reti", "Infrastrutture", "Sistemi Distribuiti", "Sicurezza"],
        },
      },
    },
    skills: {
      label: "Competenze",
      title: "Competenze",
      hint: "passa su una categoria",
      skills: "skill",
      categories: {
        "Development & Engineering": "Sviluppo & Engineering",
        Infrastructure: "Infrastruttura",
        "Advanced Programming": "Programmazione Avanzata",
        "Algorithms & Data Structures": "Algoritmi & Strutture Dati",
        Cybersecurity: "Cybersecurity",
      },
    },
    projects: {
      label: "Progetti",
      title: "Progetti",
      drag: "trascina →",
      scrollHint: "scorri — le card scorrono in orizzontale",
      proofLabels: {
        role: "Ruolo",
        output: "Output",
      },
      items: [
        {
          title: "Computer Vision AI",
          description:
            "Pipeline di object detection personalizzata collegata a una web app, dove le nuove scansioni migliorano il modello nel tempo.",
          proof: {
            role: "Training YOLO, dataset sintetico e prototipo web.",
            output: "Riconoscimento oggetti collegato a scansioni riutilizzabili.",
          },
        },
        {
          title: "E-commerce Abbigliamento",
          description: "Progetto e-commerce completo con storefront, flusso ordini, spedizioni, recensioni e pannello di amministrazione.",
          proof: {
            role: "Storefront, logica ordini e pannello admin.",
            output: "Catalogo, checkout, spedizioni, recensioni e rating.",
          },
        },
        {
          title: "Gestione Aule Universitarie",
          description: "Piattaforma di prenotazione per spazi universitari ed eventi ricorrenti, con tracking, OpenAPI e servizi MySQL.",
          proof: {
            role: "Backend Java REST, database e flussi di prenotazione.",
            output: "Aule, eventi ricorrenti, tracking e documentazione OpenAPI.",
          },
        },
        {
          title: "AI di Raccomandazione ML",
          description:
            "Motore di raccomandazione che combina preferenze statiche e dinamiche per suggerire elementi più pertinenti.",
          proof: {
            role: "Modello di ranking e gestione preferenze utente.",
            output: "Suggerimenti riutilizzabili su dataset e categorie diverse.",
          },
        },
        {
          title: "Siti WordPress",
          description: "Una serie di siti per attività locali, focalizzati su velocità, chiarezza e consegna pratica.",
          proof: {
            role: "Setup, tema, contenuti tecnici e deploy.",
            output: "Siti gestibili dal cliente con stack WordPress/Docker.",
          },
        },
      ],
    },
    experience: {
      label: "Esperienza",
      title: "Esperienza",
      items: [
        {
          date: "2023 — 2024",
          title: "Tirocinio in Aptar",
          location: "Chieti, Italia",
          description:
            "Proof of concept con Unity, Python, Blender, Angular/Ionic e Swift: dataset accelerato, modello YOLO addestrato e applicazione web, mobile nativa e Apple Vision Pro fruibile online e offline.",
        },
        {
          date: "2025 — Presente",
          title: "Software Developer",
          location: "Netsons",
          description:
            "Sviluppo e integrazione di funzionalità e servizi web. Collaborazione con il reparto sistemi su infrastruttura, automazione CI/CD e delivery containerizzato.",
        },
      ],
    },
    contact: {
      label: "Contatto",
      title: "Contatto",
      titleEm: "",
      sub: "Per collaborazioni o opportunità su software, AI e infrastruttura, puoi scrivermi qui.",
      email: "Email",
      message: "Messaggio",
      command: "send_message()",
      send: "Invia messaggio",
      sending: "Invio...",
      sent: "Messaggio inviato ✓",
      errorSecurity: "Verifica di sicurezza fallita. Riprova.",
      errorGeneric: "Qualcosa è andato storto. Riprova.",
    },
  },
  en: {
    nav: {
      about: "About",
      education: "Education",
      skills: "Skills",
      projects: "Projects",
      experience: "Experience",
      contact: "Contact",
    },
    hero: {
      badge: "Software Developer & AI Engineer",
      scroll: "scroll",
      chatSub: "digital assistant",
      chatGreeting:
        "Hi! I'm Marco.AI — Marco's digital assistant. Ask me about his experience, skills, projects, or availability.",
      chatPlaceholder: "Ask a question...",
      chips: ["Tell me about Marco", "What are his skills?", "Recent projects?", "Is he available?"],
      roles: ["Software Developer", "AI & Computer Vision", "Infrastructure", "Product Prototyping"],
      ctaWork: "Work together",
      ctaCV: "Download CV",
      chatErrorGeneric: "I couldn't process that. Try asking something else.",
      chatErrorTimeout: "Security check timed out. Please try again.",
      chatErrorOffline: "Connection error. Try again!",
    },
    about: {
      label: "Profile",
      title: "Profile",
      bio: [
        "I'm Marco, a <strong>Software Developer</strong> with experience across web systems, artificial intelligence, and infrastructure.",
        "I work at Netsons on web features, service integration, and delivery automation with CI/CD and containers.",
        "I graduated in Computer Science at the University of L'Aquila with a thesis on computer vision and mixed reality with Apple Vision Pro.",
      ],
      termTitle: "marco@dev — profile.sh",
    },
    education: {
      label: "Education",
      title: "Education",
      msc: "MSc in progress",
      bsc: "Bachelor's",
      thesis: "Bachelor Thesis",
      ongoing: "In progress",
      done: "Completed",
      distance: "TO ↔ AQ · ~550 km",
      items: {
        bsc: {
          degree: "Bachelor's Degree in Computer Science (100/110)",
          school: "University of L'Aquila — L'Aquila",
          focus: "AI & Machine Learning, Web Technology, Web Engineering, Advanced Web Development",
          tags: ["AI/ML", "Web Tech", "Web Engineering", "Java", "Python"],
        },
        thesis: {
          degree: "Bachelor Thesis",
          school: "Computer Vision and Mixed Reality",
          focus: "Product prototyping with Apple Vision Pro",
          tags: ["Apple Vision Pro", "Computer Vision", "Mixed Reality", "Prototyping"],
        },
        msc: {
          degree: "MSc in Computer Engineering",
          school: "Polytechnic University of Turin — Turin",
          focus: "Computer Networking & Network Infrastructures",
          tags: ["Networks", "Infrastructure", "Distributed Systems", "Security"],
        },
      },
    },
    skills: {
      label: "Skills",
      title: "Skills",
      hint: "hover a category",
      skills: "skills",
      categories: {
        "Development & Engineering": "Development & Engineering",
        Infrastructure: "Infrastructure",
        "Advanced Programming": "Advanced Programming",
        "Algorithms & Data Structures": "Algorithms & Data Structures",
        Cybersecurity: "Cybersecurity",
      },
    },
    projects: {
      label: "Projects",
      title: "Projects",
      drag: "drag →",
      scrollHint: "scroll — the cards glide sideways",
      proofLabels: {
        role: "Role",
        output: "Output",
      },
      items: [
        {
          title: "Computer Vision AI",
          description:
            "A custom object detection pipeline connected to a web app where new scans can improve the model over time.",
          proof: {
            role: "YOLO training, synthetic dataset, and web prototype.",
            output: "Object recognition connected to reusable scans.",
          },
        },
        {
          title: "Clothing E-commerce",
          description: "A full e-commerce project with storefront, order flow, shipping workflows, reviews, ratings, and admin logic.",
          proof: {
            role: "Storefront, order logic, and admin panel.",
            output: "Catalog, checkout, shipping, reviews, and ratings.",
          },
        },
        {
          title: "University Classroom Management System",
          description: "A scheduling platform for university spaces and recurring events, with classroom booking, tracking, OpenAPI, and MySQL-backed services.",
          proof: {
            role: "Java REST backend, database, and booking workflows.",
            output: "Rooms, recurring events, tracking, and OpenAPI docs.",
          },
        },
        {
          title: "Machine Learning Recommendation AI",
          description:
            "A recommendation engine that combines static and dynamic user preferences to suggest more relevant items.",
          proof: {
            role: "Ranking model and user-preference handling.",
            output: "Reusable suggestions across datasets and categories.",
          },
        },
        {
          title: "WordPress Websites",
          description: "A set of websites for local businesses, focused on speed, clarity, and practical delivery.",
          proof: {
            role: "Setup, theme, technical content, and deployment.",
            output: "Client-editable sites on a WordPress/Docker stack.",
          },
        },
      ],
    },
    experience: {
      label: "Experience",
      title: "Experience",
      items: [
        {
          date: "2023 — 2024",
          title: "Aptar Internship",
          location: "Chieti, Italy",
          description:
            "Built a proof of concept with Unity, Python, Blender, Angular/Ionic, and Swift: accelerated dataset creation, trained a YOLO-based model, and delivered a web, native mobile, and Apple Vision Pro application usable online and offline.",
        },
        {
          date: "2025 — Present",
          title: "Software Developer",
          location: "Netsons",
          description:
            "Development and integration of web features and services. Collaboration with the systems team on infrastructure, CI/CD automation, and containerized delivery.",
        },
      ],
    },
    contact: {
      label: "Contact",
      title: "Contact",
      titleEm: "",
      sub: "For collaborations or opportunities in software, AI, and infrastructure, use the form below.",
      email: "Email",
      message: "Message",
      command: "send_message()",
      send: "Send message",
      sending: "Sending...",
      sent: "Message sent ✓",
      errorSecurity: "Security check failed. Please try again.",
      errorGeneric: "Something went wrong. Please try again.",
    },
  },
};
