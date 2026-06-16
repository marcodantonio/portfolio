import React from "react";
import { CgWorkAlt } from "react-icons/cg";

export const heroFacts = [
  {
    label: "Based in",
    value: "Pescara, Italy",
  },
  {
    label: "Current focus",
    value: "Software development, AI, infrastructure",
  },
  {
    label: "Build style",
    value: "Pragmatic, product-focused, fast",
  },
] as const;

export const experiencesData = [
  {
    title: "Aptar Internship",
    location: "Chieti, Italy",
    description:
      "Built a proof of concept with Unity, Python, Blender, Angular/Ionic, and Swift: accelerated dataset creation, trained a YOLO-based model, and delivered a web, native mobile, and Apple Vision Pro application usable online and offline.",
    icon: React.createElement(CgWorkAlt),
    date: "2023 — 2024",
  },
  {
    title: "Software Developer",
    location: "Netsons",
    description:
      "Development and integration of new web features and services. Collaboration with the systems team on infrastructure optimization, scalable solutions, CI/CD automation, and containerized delivery.",
    icon: React.createElement(CgWorkAlt),
    date: "2025 — Present",
  },
] as const;

export const projectsData = [
  {
    title: "Computer Vision AI",
    description:
      "A custom object detection pipeline connected to a web app where new scans can improve the model over time.",
    tags: ["Python", "YOLOv8", "Object Detection", "Blender", "AI"],
  },
  {
    title: "Clothing E-commerce",
    description:
      "A full e-commerce project with storefront, order flow, shipping workflows, reviews, ratings, and admin logic.",
    tags: ["JavaScript", "HTML5", "CSS", "MySQL", "Bootstrap", "PHP"],
  },
  {
    title: "University Classroom Management System",
    description:
      "A scheduling platform for university spaces and recurring events, with classroom booking, tracking, admin workflows, OpenAPI documentation, and MySQL-backed services.",
    tags: [
      "Java",
      "RESTful Services",
      "MySQL",
      "Java Servlet",
      "AJAX",
      "OpenAPI",
    ],
  },
  {
    title: "Machine Learning Recommendation AI",
    description:
      "A recommendation engine that combines static and dynamic user preferences to suggest more relevant items across different datasets.",
    tags: ["Python", "Machine Learning", "Data Analysis", "AI"],
  },
  {
    title: "WordPress Websites",
    description:
      "A set of early websites for local businesses, focused on speed, clarity, and practical delivery.",
    tags: ["WordPress", "Docker", "MariaDB", "PHP"],
  },
] as const;

export const skillsData = [
  {
    category: "Development & Engineering",
    skills: [
      "Java",
      "Python",
      "Swift for iOS & visionOS",
      "PHP",
      "HTML5, CSS, JavaScript",
      "OpenAPI",
      "Agile Methodologies",
      "Design Patterns",
      "Responsive Design",
      "Object-Oriented Programming",
      "REST APIs",
    ],
  },
  {
    category: "Infrastructure",
    skills: [
      "MySQL",
      "Redis",
      "Git",
      "GitHub",
      "Docker",
      "Linux",
      "Nginx",
      "CI/CD Pipelines",
      "Proxmox",
      "ZFS",
      "VLANs",
      "VPNs",
      "Routing",
    ],
  },
  {
    category: "Advanced Programming",
    skills: [
      "Blender",
      "Unity",
      "TensorFlow",
      "PyTorch",
      "YOLO",
      "Object Detection",
      "Machine Learning",
      "Computer Vision",
      "Generative AI",
      "HoloLens Development",
      "Apple Vision Pro prototyping",
    ],
  },
  {
    category: "Algorithms & Data Structures",
    skills: [
      "Data Structures",
      "Algorithms",
      "Operational Research",
      "Combinatory Optimization",
    ],
  },
  {
    category: "Cybersecurity",
    skills: [
      "Network Security",
      "Cryptography",
      "SSL/TLS",
      "Firewalls",
      "SSH Tunneling",
    ],
  },
] as const;
