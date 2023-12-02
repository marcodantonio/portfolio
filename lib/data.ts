import React from "react";
import { CgWorkAlt } from "react-icons/cg";
import { FaReact } from "react-icons/fa";
import { LuGraduationCap } from "react-icons/lu";
import amelieItaliaImg from "@/public/amelie-italia.png";
import yoloImg from "@/public/yolo.png";

export const links = [
  {
    name: "Home",
    hash: "#home",
  },
  {
    name: "About",
    hash: "#about",
  },
  {
    name: "Projects",
    hash: "#projects",
  },
  {
    name: "Skills",
    hash: "#skills",
  },
  {
    name: "Experience",
    hash: "#experience",
  },
  {
    name: "Contact",
    hash: "#contact",
  },
] as const;

export const experiencesData = [
  {
    title: "Computer Science Bachelor's Degree",
    location: "L'Aquila, AQ",
    description:
      "I'm in my last year of the bachelor's degree in Computer Science at the University of L'Aquila. A journey into the heart of IT: from machine learning to image processing, via the must-have algorithms and data structures. Practice with Java and Python, complemented by a deep dive into web engineering.",
    icon: React.createElement(LuGraduationCap),
    date: "2020 - Current",
  },
  {
    title: "Aptar Intership",
    location: "Chieti, CH",
    description:
      "In my internship with Aptar, I developed a hybrid webapp in Angular, implementing YOLO to recognize Aptar products by scanning images. I also created a custom script in Blender to quickly scan CAD models, facilitating the training of the artificial intelligence model. This innovation made the lead process more efficient, improving communication with potential customers.",
    icon: React.createElement(CgWorkAlt),
    date: "2023",
  },
] as const;

export const projectsData = [
  {
    title: "Computer Vision AI",
    description:
      "Model trained on a custom dataset from scratch. With web application, where each scan helps to continuously improve his accuracy.",
    tags: ["Python", "YOLOv8", "Self Generative AI", "Object Detection", "Blender"],
    imageUrl: yoloImg,
  },
  {
    title: "Wordpress Websites",
    description: "In my young age I have created several websites with Wordpress for some local businesses.",
    tags: ["Wordpress", "Docker", "MariaDB", "PHP"],
    imageUrl: amelieItaliaImg,
  },
] as const;

export const skillsData = [
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Tailwind",
  "Framer Motion",
  "Bootstrap",
  "Node.js",
  "Java",
  "Python",
  "PHP",
  "MySQL",
  "MariaDB",
  "Git",
  "Docker",
  "Docker Compose",
  "Docker Swarm",
  "Kubernetes",
  "Helm",
  "Nginx",
  "Apache",
  "Wordpress",
  "Blender",
  "YOLOv8", 
  "Self Generative AI",
  "Object Detection",
  "Image Processing",
  "Machine Learning",
  "Deep Learning",
  "Computer Vision",
  "Data Structures",
] as const;
