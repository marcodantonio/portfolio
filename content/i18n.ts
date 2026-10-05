import type { IslandId } from "@/lib/island-map";

export type Lang = "it" | "en";

type ArchipelagoCopy = {
  quickProjects: string; quickContact: string; quickCv: string;
  exploreHint: string; readingLabel: string; worldMode: string; readerMode: string; backToWorld: string; dossier: string;
  travel: { boat: string; boatReturn: string; cannon: string; parachute: string; skip: string; travelling: string; complete: string };
  notebook: { title: string; pages: string[]; introduction: string[]; approach: string[]; personal: string[]; related: string };
  caseStudy: { index: string; problem: string; contribution: string; solution: string; result: string; technologies: string; evidence: string; problems: string[]; missingLinks: string; open: string };
  capabilities: { index: string; tools: string; examples: string; foundation: string; viewExperience: string; viewEducation: string };
  timeline: { index: string; role: string; contribution: string; organisations: string[]; roleTypes: string[]; contributionNotes: string[] };
  archive: { title: string; filter: string; all: string; type: string; status: string; period: string; periodMissing: string; types: string[] };
  tesla: { intro: string; vehicle: string; model: string; year: string; personal: string; demo: string; demoDescription: string; colors: string[]; selected: string; documentation: string; missing: string; disclaimer: string; contact: string; subject: string };
  dance: { intro: string; athlete: string; teacher: string; athleteDescription: string; teacherDescription: string; disciplines: string; media: string; mediaMissing: string; teachingMissing: string; contact: string; subject: string };
  contact: { title: string; direct: string; topics: string[]; topicLabel: string; emailAction: string; noSubmission: string };
};

type Copy = {
  archipelago: ArchipelagoCopy;
  nav: { about: string; education: string; skills: string; projects: string; experience: string; contact: string };
  boot: { label: string; skip: string; lines: string[] };
  game: {
    title: string;
    kicker: string;
    description: string;
    start: string;
    loading: string;
    read: string;
    back: string;
    close: string;
    map: string;
    mapHint: string;
    home: string;
    currentIsland: string;
    discovered: string;
    move: string;
    sprint: string;
    jump: string;
    interact: string;
    exploreIsland: string;
    resume: string;
    controls: string;
    day: string;
    night: string;
    reset: string;
    unavailable: string;
    canvasLabel: string;
    touchLabel: string;
    welcomeHint: string;
    contentLabel: string;
    soundOn: string;
    soundOff: string;
    approachStation: string;
    readStation: string;
    leaveInspection: string;
    previousStation: string;
    nextStation: string;
    stationDetails: string;
    stationHint: string;
    exhibits: {
      profile: string;
      work: string;
      education: string[];
      experience: string[];
      contact: string;
    };
    directions: { up: string; left: string; down: string; right: string };
    islands: Record<IslandId | "home" | "welcome" | "tesla" | "dance", { name: string; subtitle: string }>;
  };
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
    chatSend: string;
    availability: string;
  };
  journey: {
    stages: Array<{ stage: string; title: string; detail: string }>;
    ai: { label: string; open: string; close: string; status: string };
    selectNode: string;
    aiPrompt: string;
    educationNodes: string[];
    skillNodes: string[];
    skillDescriptions: string[];
    projectNodes: string[];
    experienceNodes: string[];
    profile: {
      portraitAlt: string;
      location: string;
      currentLabel: string;
      currentValue: string;
      focusLabel: string;
      focusValue: string;
    };
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
    archipelago: {
      quickProjects: "Progetti", quickContact: "Contatto", quickCv: "CV",
      exploreHint: "Dal porto, il ponte principale porta all’Officina Digitale. I progetti sono il cuore del mio lavoro.",
      readingLabel: "Tutto il portfolio, senza giocare", worldMode: "Esplora il mondo", readerMode: "Modalità lettura", backToWorld: "Torna al mondo", dossier: "Apri il contenuto",
      travel: { boat: "Barca per il garage", boatReturn: "Barca per il porto", cannon: "Lancio al laboratorio", parachute: "Paracadute per l’officina", skip: "Salta il viaggio", travelling: "Viaggio in corso", complete: "Sei arrivato" },
      notebook: {
        title: "Dal mio taccuino", pages: ["In breve", "Il mio lavoro", "Fuori dall’IT"],
        introduction: ["Sono Marco D’Antonio, Software Developer & AI Engineer a Pescara. Sviluppo applicazioni, integro servizi e lavoro su intelligenza artificiale e infrastrutture.", "Il mio percorso attraversa sistemi web, computer vision e prototipi in mixed reality. Fuori dall’IT, coltivo la passione per Tesla e il modding e sono atleta e insegnante di danze standard e danza sportiva."],
        approach: ["Mi interessa il percorso completo di un software: dal modello o dall’API fino all’applicazione e all’infrastruttura che la rende utilizzabile.", "Nei progetti trovi il mio contributo concreto, le tecnologie utilizzate e ciò che è stato realizzato. Esperienza e Formazione raccolgono invece ruoli, studi e ricerca."],
        personal: ["La mia Model 3 pre-refresh del 2021 è il riferimento della baia Tesla: un luogo dedicato a personalizzazione e modding.", "La danza ha uno spazio proprio nel mio mondo, con due aspetti distinti: il percorso da atleta e l’attività di insegnante."],
        related: "Continua a leggere",
      },
      caseStudy: {
        index: "Catalogo dei progetti", problem: "Problema", contribution: "Il mio contributo", solution: "Soluzione", result: "Risultato", technologies: "Tecnologie", evidence: "Materiali del progetto", open: "Apri il caso studio",
        problems: ["Riconoscere oggetti e collegare le scansioni a una pipeline di computer vision riutilizzabile.", "Gestire la vendita di abbigliamento, dal catalogo agli ordini e alle attività di amministrazione.", "Organizzare spazi universitari, prenotazioni ed eventi ricorrenti in un sistema consultabile.", "Generare suggerimenti pertinenti usando preferenze utente statiche e dinamiche.", "Dare alle attività locali siti chiari e aggiornabili direttamente dal cliente."],
        missingLinks: "Screenshot, demo e repository specifici non sono ancora pubblicati in questa scheda. Le immagini del mondo 3D sono scenografia, non prove del progetto.",
      },
      capabilities: { index: "Moduli del laboratorio", tools: "Strumenti e conoscenze", examples: "Applicazioni concrete", foundation: "Approfondito nel percorso di studio; nessun caso specifico è associato qui.", viewExperience: "Leggi l’esperienza in Netsons", viewEducation: "Consulta la formazione" },
      timeline: { index: "Indice delle tappe", role: "Ruolo e contesto", contribution: "Attività e contributi", organisations: ["Netsons", "Aptar"], roleTypes: ["Software Developer", "Tirocinio"], contributionNotes: ["Sviluppo web e integrazione servizi, in collaborazione con il reparto sistemi per infrastruttura, CI/CD e container.", "Dataset sintetico e training YOLO; prototipo utilizzabile su web, mobile nativo e Apple Vision Pro, online e offline."] },
      archive: { title: "Archivio di studio e ricerca", filter: "Filtra per stato", all: "Tutti i documenti", type: "Tipo", status: "Stato", period: "Periodo", periodMissing: "Periodo non indicato nei contenuti disponibili.", types: ["Titolo di studio", "Tesi e ricerca", "Percorso in corso"] },
      tesla: {
        intro: "Tesla, modding e personalizzazione: una passione personale, distinta dal mio lavoro principale nell’IT.",
        vehicle: "La mia auto", model: "Tesla Model 3", year: "2021 · pre-refresh", personal: "Il modello personale di riferimento è una Model 3 pre-refresh del 2021. Colore e configurazione reali non sono documentati qui.",
        demo: "Banco wrap · demo visiva", demoDescription: "Prova una variante di colore sulla vettura del mondo 3D. È un’anteprima estetica dimostrativa, non una modifica eseguita né un configuratore commerciale.",
        colors: ["Bianco perla", "Viola", "Blu oceano", "Grafite"], selected: "Campione selezionato",
        documentation: "Interventi documentati", missing: "Da completare con interventi realmente eseguiti, fotografie e risultati. Le reference del garage non sono fotografie della mia vettura e non costituiscono un prima/dopo.",
        disclaimer: "Spazio personale indipendente: non è un centro ufficiale Tesla. Nessun servizio o qualifica professionale viene dichiarato in questa pagina.", contact: "Parliamo di Tesla", subject: "Tesla e personalizzazione",
      },
      dance: {
        intro: "Danze standard e danza sportiva: un’attività concreta che vivo come atleta e come insegnante.", athlete: "Atleta", teacher: "Insegnante",
        athleteDescription: "Il mio percorso sportivo nella danza ha qui il proprio spazio, separato dall’attività professionale nell’IT.", teacherDescription: "Accanto al percorso da atleta svolgo attività di insegnamento della danza. Per parlarne, puoi contattarmi direttamente.",
        disciplines: "Danze standard · Danza sportiva", media: "Percorso e media reali", mediaMissing: "Gare, risultati e fotografie o video del percorso sportivo sono ancora da documentare. La pedana 3D è un ambiente illustrativo, non la ripresa di una performance.",
        teachingMissing: "Destinatari delle lezioni, approccio, sedi, disponibilità e qualifiche saranno descritti quando confermati. Non sono pubblicate offerte o prenotazioni.", contact: "Scrivimi per la danza", subject: "Danza e insegnamento",
      },
      contact: { title: "Una linea diretta", direct: "Per lavoro, collaborazioni o una domanda sulle altre parti del mio mondo, scrivimi.", topics: ["Software, AI e infrastrutture", "Tesla e personalizzazione", "Danza e insegnamento", "Altro"], topicLabel: "Di cosa vuoi parlare?", emailAction: "Apri la tua email", noSubmission: "Si apre il tuo programma email. Nessun messaggio viene inviato da questo sito." },
    },
    // The game and the direct reader share the same factual portfolio content.
    boot: {
      label: "Avvio del portfolio",
      skip: "Salta introduzione",
      lines: ["Un arcipelago da esplorare", "Preparazione delle isole", "Software · AI · Infrastruttura", "Il portfolio di Marco D’Antonio"],
    },
    game: {
      title: "Un piccolo mondo.\nIl mio.",
      kicker: "IL PORTFOLIO, DA ESPLORARE",
      description: "Sono Marco D’Antonio, Software Developer & AI Engineer a Pescara. Sviluppo software, applico l’AI e costruisco l’infrastruttura che li mette al lavoro.",
      start: "Inizia a esplorare",
      loading: "Preparazione dell’arcipelago…",
      read: "Preferisco leggere",
      back: "Torna all’arcipelago",
      close: "Chiudi",
      map: "Mappa",
      mapHint: "Scegli un luogo per raggiungerlo o leggerne subito i contenuti. Ogni destinazione è già accessibile.",
      home: "Porto di arrivo",
      currentIsland: "Ti trovi qui",
      discovered: "luoghi visitati",
      move: "Muoviti",
      sprint: "Corri",
      jump: "Salta",
      interact: "Leggi",
      exploreIsland: "Raggiungi il luogo",
      resume: "Riprendi l’esplorazione",
      controls: "Comandi",
      day: "Passa al giorno",
      night: "Passa alla notte",
      reset: "Torna alla partenza",
      unavailable: "La vista 3D non è disponibile in questo browser. Puoi leggere tutto il portfolio qui sotto.",
      canvasLabel: "Arcipelago interattivo del portfolio di Marco D’Antonio. Usa WASD o le frecce per muoverti, E per leggere i contenuti dell’isola, Escape per aprire la mappa.",
      touchLabel: "Controlli touch del personaggio",
      welcomeHint: "WASD o frecce per muoverti · E per leggere · Esc per la mappa",
      contentLabel: "Leggi il portfolio",
      soundOn: "Attiva i suoni dell’isola",
      soundOff: "Disattiva i suoni",
      approachStation: "Avvicinati all’oggetto",
      readStation: "Apri il contenuto",
      leaveInspection: "Torna a camminare",
      previousStation: "Oggetto precedente",
      nextStation: "Oggetto successivo",
      stationDetails: "Apri il dossier",
      stationHint: "Taccuini, prototipi e strumenti raccontano il mio mondo. Avvicinati e premi E.",
      exhibits: {
        profile: "Sviluppo software e lavoro su intelligenza artificiale e infrastrutture. Vivo a Pescara.",
        work: "In Netsons sviluppo funzionalità web, integro servizi e collaboro al delivery con CI/CD e container.",
        education: [
          "Laurea in Informatica all’Università dell’Aquila, 100/110. Studio di AI, machine learning e tecnologie web.",
          "Tesi su computer vision e mixed reality: prototipazione di prodotti con Apple Vision Pro.",
          "Magistrale in Ingegneria Informatica al Politecnico di Torino. Focus su networking e infrastrutture di rete.",
        ],
        experience: [
          "Sviluppo e integrazione di servizi web. Collaborazione con il reparto sistemi su infrastruttura, CI/CD e container.",
          "Tirocinio: dataset sintetico, modello YOLO e prototipo di computer vision per web, mobile e Apple Vision Pro.",
        ],
        contact: "Per progetti, collaborazioni e opportunità su software, AI e infrastrutture, scrivimi.",
      },
      directions: { up: "Vai avanti", left: "Vai a sinistra", down: "Vai indietro", right: "Vai a destra" },
      islands: {
        home: { name: "Benvenuto", subtitle: "Il punto di partenza" },
        welcome: { name: "Benvenuto", subtitle: "Il porto di arrivo" },
        about: { name: "Chi sono", subtitle: "La casa-studio" },
        skills: { name: "Competenze", subtitle: "Il laboratorio sospeso" },
        projects: { name: "Progetti", subtitle: "L’officina digitale" },
        education: { name: "Formazione", subtitle: "L’archivio e l’osservatorio" },
        experience: { name: "Esperienza", subtitle: "La scogliera delle tappe" },
        tesla: { name: "Tesla", subtitle: "La baia e il garage" },
        dance: { name: "Danza", subtitle: "Atleta e insegnante" },
        contact: { name: "Contatto", subtitle: "Il faro" },
      },
    },
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
      ctaWork: "Esplora i progetti",
      ctaCV: "Scarica il CV",
      chatErrorGeneric: "Non riesco ad elaborare la richiesta. Riprova.",
      chatErrorTimeout: "Verifica di sicurezza scaduta. Riprova.",
      chatErrorOffline: "Errore di connessione. Riprova!",
      chatSend: "Invia la domanda",
      availability: "Disponibile per collaborazioni",
    },
    journey: {
      stages: [
        {
          stage: "Segnale",
          title: "Marco D'Antonio",
          detail: "Sviluppo software, applico l'AI e costruisco l'infrastruttura che li mette al lavoro.",
        },
        {
          stage: "Profilo",
          title: "Tra software e infrastruttura.",
          detail: "Lavoro in Netsons su funzionalità web, integrazione servizi e delivery con CI/CD e container.",
        },
        {
          stage: "Formazione",
          title: "Formazione e ricerca.",
          detail: "Dall'Informatica all'Aquila alle reti a Torino, passando per la computer vision e la mixed reality.",
        },
        {
          stage: "Competenze",
          title: "Competenze che si connettono.",
          detail: "Il mio stack attraversa applicazioni, modelli e infrastrutture. Esplora le cinque aree.",
        },
        {
          stage: "Progetti",
          title: "Quello che ho costruito.",
          detail: "Cinque progetti, con il mio contributo e il risultato concreto. Seleziona un nodo per entrare nel dettaglio.",
        },
        {
          stage: "Esperienza",
          title: "Dalla ricerca al lavoro quotidiano.",
          detail: "Un prototipo di computer vision in Aptar, poi lo sviluppo di servizi web e infrastrutture in Netsons.",
        },
        {
          stage: "Contatto",
          title: "Parliamone.",
          detail: "Per un progetto, una collaborazione o un'opportunità su software, AI e infrastrutture, scrivimi.",
        },
      ],
      ai: {
        label: "Marco.AI",
        open: "Apri Marco.AI",
        close: "Chiudi Marco.AI",
        status: "Assistente digitale",
      },
      selectNode: "Seleziona un nodo per esplorare",
      aiPrompt: "Oppure chiedi a Marco.AI di me, dei miei progetti e della mia esperienza.",
      educationNodes: ["L'Aquila", "Apple Vision Pro", "Torino"],
      skillNodes: ["Sviluppo", "Infrastruttura", "AI & Vision", "Algoritmi", "Sicurezza"],
      skillDescriptions: [
        "Linguaggi, API e strumenti per costruire applicazioni web e native.",
        "Database, container, automazione e reti per far funzionare i servizi.",
        "Machine learning, computer vision e prototipazione in mixed reality.",
        "Strutture dati, ricerca operativa e ottimizzazione combinatoria.",
        "Sicurezza di rete, crittografia e protezione delle connessioni.",
      ],
      projectNodes: ["Computer Vision", "E-commerce", "Gestione aule", "Recommendation AI", "WordPress"],
      experienceNodes: ["Aptar", "Netsons"],
      profile: {
        portraitAlt: "Ritratto di Marco D'Antonio",
        location: "Pescara, Italia",
        currentLabel: "Ora",
        currentValue: "Software Developer · Netsons",
        focusLabel: "Focus",
        focusValue: "Software · AI · Infrastrutture",
      },
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
    archipelago: {
      quickProjects: "Projects", quickContact: "Contact", quickCv: "CV",
      exploreHint: "The main bridge from the harbour leads to the Digital Workshop. Projects are the heart of my work.",
      readingLabel: "The complete portfolio, without playing", worldMode: "Explore the world", readerMode: "Reading mode", backToWorld: "Back to the world", dossier: "Open the content",
      travel: { boat: "Boat to the garage", boatReturn: "Boat to the harbour", cannon: "Launch to the laboratory", parachute: "Parachute to the workshop", skip: "Skip the journey", travelling: "Journey in progress", complete: "You have arrived" },
      notebook: {
        title: "From my notebook", pages: ["At a glance", "My work", "Outside IT"],
        introduction: ["I’m Marco D’Antonio, a Software Developer & AI Engineer based in Pescara. I build applications, integrate services, and work with artificial intelligence and infrastructure.", "My experience spans web systems, computer vision, and mixed-reality prototypes. Outside IT, I’m interested in Tesla and modding, and I’m an athlete and teacher in standard ballroom and competitive dance."],
        approach: ["I’m interested in the full path of a piece of software: from a model or API to the application and infrastructure that make it usable.", "Projects describe my concrete contribution, the technologies used, and what was built. Experience and Education cover professional roles, studies, and research."],
        personal: ["My 2021 pre-refresh Model 3 is the personal reference for the Tesla bay: a place for customisation and modding.", "Dance has its own place in my world, with two distinct sides: my path as an athlete and my activity as a teacher."], related: "Keep reading",
      },
      caseStudy: {
        index: "Project catalogue", problem: "Problem", contribution: "My contribution", solution: "Solution", result: "Outcome", technologies: "Technologies", evidence: "Project materials", open: "Open the case study",
        problems: ["Recognise objects and connect scans to a reusable computer-vision pipeline.", "Manage clothing sales, from the catalogue to orders and administration workflows.", "Organise university spaces, bookings, and recurring events in a queryable system.", "Produce relevant suggestions from static and dynamic user preferences.", "Give local businesses clear websites that their owners can update directly."],
        missingLinks: "Project-specific screenshots, demos, and repositories have not been published in this case study yet. The 3D world is scenery, not project evidence.",
      },
      capabilities: { index: "Laboratory modules", tools: "Tools and knowledge", examples: "Concrete applications", foundation: "Covered in my studies; no specific case study is linked here.", viewExperience: "Read about my work at Netsons", viewEducation: "Browse education" },
      timeline: { index: "Experience index", role: "Role and context", contribution: "Activities and contributions", organisations: ["Netsons", "Aptar"], roleTypes: ["Software Developer", "Internship"], contributionNotes: ["Web development and service integration, working with the systems team on infrastructure, CI/CD, and containers.", "Synthetic dataset and YOLO training; a prototype usable on web, native mobile, and Apple Vision Pro, online and offline."] },
      archive: { title: "Study and research archive", filter: "Filter by status", all: "All documents", type: "Type", status: "Status", period: "Period", periodMissing: "Dates are not specified in the available content.", types: ["Academic qualification", "Thesis and research", "Ongoing programme"] },
      tesla: {
        intro: "Tesla, modding, and customisation: a personal passion, separate from my main work in IT.",
        vehicle: "My car", model: "Tesla Model 3", year: "2021 · pre-refresh", personal: "My personal reference is a 2021 pre-refresh Model 3. Its actual colour and configuration are not documented here.",
        demo: "Wrap workbench · visual demo", demoDescription: "Try a colour variant on the car in the 3D world. This is a demonstrative aesthetic preview, not a completed modification or a commercial configurator.",
        colors: ["Pearl white", "Violet", "Ocean blue", "Graphite"], selected: "Selected sample", documentation: "Documented modifications", missing: "To be completed with modifications actually carried out, photographs, and results. The garage references are not photographs of my car and do not constitute before-and-after evidence.",
        disclaimer: "An independent personal space, not an official Tesla centre. This page does not claim any available service or professional qualification.", contact: "Let’s talk about Tesla", subject: "Tesla and customisation",
      },
      dance: {
        intro: "Standard ballroom and competitive dance: an activity I pursue both as an athlete and as a teacher.", athlete: "Athlete", teacher: "Teacher",
        athleteDescription: "My sporting journey in dance has its own space here, separate from my professional work in IT.", teacherDescription: "Alongside my activity as an athlete, I also teach dance. You can contact me directly to discuss it.",
        disciplines: "Standard ballroom · Competitive dance", media: "Journey and real media", mediaMissing: "Competitions, results, and photographs or videos of my sporting journey are still to be documented. The 3D dance floor is an illustrative setting, not footage of a performance.",
        teachingMissing: "Students, approach, venues, availability, and qualifications will be described when confirmed. No offers or bookings are published here.", contact: "Ask me about dance", subject: "Dance and teaching",
      },
      contact: { title: "A direct line", direct: "For work, collaborations, or a question about the other parts of my world, send me an email.", topics: ["Software, AI, and infrastructure", "Tesla and customisation", "Dance and teaching", "Other"], topicLabel: "What would you like to discuss?", emailAction: "Open your email app", noSubmission: "This opens your email app. This website does not send a message." },
    },
    boot: {
      label: "Starting the portfolio",
      skip: "Skip introduction",
      lines: ["An archipelago to explore", "Preparing the islands", "Software · AI · Infrastructure", "Marco D’Antonio’s portfolio"],
    },
    game: {
      title: "A little world.\nMy own.",
      kicker: "A PORTFOLIO TO EXPLORE",
      description: "I’m Marco D’Antonio, a Software Developer & AI Engineer in Pescara. I build software, apply AI, and create the infrastructure that puts them to work.",
      start: "Start exploring",
      loading: "Preparing the archipelago…",
      read: "I’d rather read",
      back: "Back to the archipelago",
      close: "Close",
      map: "Map",
      mapHint: "Choose a place to travel there or read its content immediately. Every destination is already available.",
      home: "Arrival harbour",
      currentIsland: "You are here",
      discovered: "places visited",
      move: "Move",
      sprint: "Run",
      jump: "Jump",
      interact: "Read",
      exploreIsland: "Travel to this place",
      resume: "Resume exploring",
      controls: "Controls",
      day: "Switch to day",
      night: "Switch to night",
      reset: "Back to the start",
      unavailable: "The 3D view is unavailable in this browser. You can read the entire portfolio below.",
      canvasLabel: "Marco D’Antonio’s interactive portfolio archipelago. Use WASD or the arrow keys to move, E to read the island’s content, and Escape to open the map.",
      touchLabel: "Character touch controls",
      welcomeHint: "WASD or arrows to move · E to read · Esc for the map",
      contentLabel: "Read the portfolio",
      soundOn: "Enable island sounds",
      soundOff: "Mute sounds",
      approachStation: "Walk up to the object",
      readStation: "Open the content",
      leaveInspection: "Back to exploring",
      previousStation: "Previous object",
      nextStation: "Next object",
      stationDetails: "Open the dossier",
      stationHint: "Notebooks, prototypes, and tools tell the story of my world. Walk up and press E.",
      exhibits: {
        profile: "I develop software and work with AI and infrastructure. Based in Pescara, Italy.",
        work: "At Netsons I develop web features, integrate services, and work on delivery with CI/CD and containers.",
        education: [
          "Computer Science degree at the University of L’Aquila, 100/110. AI, machine learning, and web technologies.",
          "Thesis on computer vision and mixed reality: product prototyping with Apple Vision Pro.",
          "MSc in Computer Engineering at the Polytechnic University of Turin. Networking and network infrastructure.",
        ],
        experience: [
          "Developing and integrating web services. Working with the systems team on infrastructure, CI/CD, and containers.",
          "Internship: synthetic dataset, YOLO model, and a computer vision prototype for web, mobile, and Apple Vision Pro.",
        ],
        contact: "For projects, collaborations, and opportunities in software, AI, and infrastructure, get in touch.",
      },
      directions: { up: "Move forward", left: "Move left", down: "Move backward", right: "Move right" },
      islands: {
        home: { name: "Welcome", subtitle: "Your starting point" },
        welcome: { name: "Welcome", subtitle: "The arrival harbour" },
        about: { name: "About", subtitle: "The home studio" },
        skills: { name: "Skills", subtitle: "The suspended laboratory" },
        projects: { name: "Projects", subtitle: "The digital workshop" },
        education: { name: "Education", subtitle: "The archive and observatory" },
        experience: { name: "Experience", subtitle: "The career cliffs" },
        tesla: { name: "Tesla", subtitle: "The bay and garage" },
        dance: { name: "Dance", subtitle: "Athlete and teacher" },
        contact: { name: "Contact", subtitle: "The lighthouse" },
      },
    },
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
      ctaWork: "Explore my projects",
      ctaCV: "Download CV",
      chatErrorGeneric: "I couldn't process that. Try asking something else.",
      chatErrorTimeout: "Security check timed out. Please try again.",
      chatErrorOffline: "Connection error. Try again!",
      chatSend: "Send question",
      availability: "Available for work",
    },
    journey: {
      stages: [
        {
          stage: "Signal",
          title: "Marco D'Antonio",
          detail: "I develop software, apply AI, and build the infrastructure that puts them to work.",
        },
        {
          stage: "Profile",
          title: "Across software and infrastructure.",
          detail: "I work at Netsons on web features, service integration, and delivery with CI/CD and containers.",
        },
        {
          stage: "Education",
          title: "Education and research.",
          detail: "From Computer Science in L'Aquila to networking in Turin, with computer vision and mixed reality along the way.",
        },
        {
          stage: "Skills",
          title: "Skills that connect.",
          detail: "My stack spans applications, models, and infrastructure. Explore the five areas.",
        },
        {
          stage: "Projects",
          title: "What I've built.",
          detail: "Five projects, with my contribution and the concrete result. Select a node to see the details.",
        },
        {
          stage: "Experience",
          title: "From research to everyday work.",
          detail: "A computer vision prototype at Aptar, followed by web services and infrastructure development at Netsons.",
        },
        {
          stage: "Contact",
          title: "Let's talk.",
          detail: "For a project, collaboration, or opportunity in software, AI, and infrastructure, get in touch.",
        },
      ],
      ai: {
        label: "Marco.AI",
        open: "Open Marco.AI",
        close: "Close Marco.AI",
        status: "Digital assistant",
      },
      selectNode: "Select a node to explore",
      aiPrompt: "Or ask Marco.AI about me, my projects, and my experience.",
      educationNodes: ["L'Aquila", "Apple Vision Pro", "Turin"],
      skillNodes: ["Development", "Infrastructure", "AI & Vision", "Algorithms", "Security"],
      skillDescriptions: [
        "Languages, APIs, and tools for building web and native applications.",
        "Databases, containers, automation, and networks that keep services running.",
        "Machine learning, computer vision, and mixed-reality prototyping.",
        "Data structures, operational research, and combinatorial optimization.",
        "Network security, cryptography, and protected connections.",
      ],
      projectNodes: ["Computer Vision", "E-commerce", "Classroom booking", "Recommendation AI", "WordPress"],
      experienceNodes: ["Aptar", "Netsons"],
      profile: {
        portraitAlt: "Portrait of Marco D'Antonio",
        location: "Pescara, Italy",
        currentLabel: "Now",
        currentValue: "Software Developer · Netsons",
        focusLabel: "Focus",
        focusValue: "Software · AI · Infrastructure",
      },
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
