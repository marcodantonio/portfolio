"use client";

import React from "react";
import SectionHeading from "./section-heading";
import { motion } from "framer-motion";
import { useSectionInView } from "@/lib/hooks";

export default function About() {
  const { ref } = useSectionInView("About");

  return (
    <motion.section
      ref={ref}
      className="mb-28 max-w-[45rem] text-center leading-8 sm:mb-40 scroll-mt-28"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.175 }}
      id="about"
    >
      <SectionHeading>About me</SectionHeading>
      <p className="mb-3">
        I am a <span className="font-medium">Computer Science</span> student with a deep passion for programming, a field that has always fascinated me because
        of its ability to transform complex ideas into tangible realities. <span className="italic">My favorite part of programming</span> is the
        problem-solving aspect. I <span className="underline">love</span> the feeling of finally figuring out a solution to a problem. During my undergraduate
        studies, I acquired solid skills in <span className="font-medium">Javascript, HTML5, CSS, and MySQL</span>. I also had the opportunity to immerse myself
        in languages such as Python, React, and Node.js, through projects that allowed me to thoroughly explore solving complex problems.
      </p>

      <p className="mb-3">
        <span className="italic">Outside of university</span>, my interests extend to various activities that stimulate my creativity and curiosity. I engage in
        fitness and video games, two passions that help me maintain a healthy balance between work and leisure. In addition, I am fascinated by the world of
        indie video games and am <span className="font-medium">actively exploring the idea of developing my own game</span>, an endeavor that excites me with
        its creative and technical challenges.
      </p>

      <p className="mb-3">
        With a solid college foundation and a <span className="font-medium">constant thirst for learning</span>, I am looking for a{" "}
        <span className="font-medium">full-time position</span> as a software developer. I am particularly interested in roles that allow me to contribute to
        innovative projects and collaborate with teams that share my passion for technology and innovation.
      </p>
    </motion.section>
  );
}
