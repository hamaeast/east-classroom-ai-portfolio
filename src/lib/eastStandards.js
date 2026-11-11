export const STANDARD_KEYS = ['self_directed', 'ethical_problem_solving', 'collaboration', 'research', 'communication', 'technology', 'confidence'];

export const STANDARD_NAMES = {
  self_directed: 'Take responsibility for self-directed learning',
  ethical_problem_solving: 'Ethically apply resources and problem-solving strategies to real-world problems',
  collaboration: 'Collaborate as a productive team member',
  research: 'Research and evaluate resources to determine their validity and relevance',
  communication: 'Communicate with a variety of audiences using multiple modes',
  technology: 'Develop solutions to community-based problems using emerging technology within the context of service learning projects',
  confidence: 'Demonstrate confidence in their own abilities to meet the challenges of the 21st century',
};

const row = (emerging, proficient, mastery) => ({ Emerging: emerging, Proficient: proficient, Mastery: mastery });
export const EAST_TARGETS = {
  'K-2': {
    self_directed: row('I can start my work when reminded.', 'I can make a simple plan and follow it to finish my work.', 'I can set goals for myself and stay focused until I reach them.'),
    ethical_problem_solving: row('I can tell when something is fair or unfair.', 'I can use kind and fair choices to solve problems.', 'I help others make fair choices when we solve problems together.'),
    collaboration: row('I share my ideas when asked.', 'I listen to others and take turns sharing.', 'I help my group make decisions and stay on task together.'),
    research: row('I can find out new things by asking questions.', 'I can use books, pictures, or technology to find answers.', 'I can share what I learned and tell where I found my information.'),
    communication: row('I can share my ideas with my teacher or classmates.', 'I can explain my ideas clearly using words or pictures.', 'I can share my ideas in different ways to help others understand me.'),
    technology: row('I can use technlogy with help.', 'I can use technology to make or share my ideas.', 'I can use technology to help others or improve something in my community.'),
    confidence: row('I can talk about what I liked doing.', 'I can tell what I learned and what I want to get better at.', 'I can share how I grew and how I can help others learn too.'),
  },
  '3-6': {
    self_directed: row('I can make and follow a plan to meet my goals with some help.', 'I can take ownership of my work and manage my time effectivley.', 'I can support others by sharing strategies that help our team reach goals.'),
    ethical_problem_solving: row('I can think about different solutions and choose the best one.', 'I can solve problems in fair and responsible ways that help others.', 'I can guide my group to make choices that respect everyones needs.'),
    collaboration: row('I can guide my group to make choices that respect everyones needs.', 'I can listen, share, and help my group stay focused on our goals.', 'I can help my group work through challenges and celebrate our progress.'),
    research: row('I can gather information from books, people, or technology.', 'I can find reliable information to support my ideas or projects', 'I can compare sources and explain why some are more useful than others.'),
    communication: row('I can share my ideas clearly with others.', 'I can use different ways to communicate (words, visuals, or tech)', 'I can adapt my communication to fit different audiences or situations.'),
    technology: row('I can use technology to share my learning.', 'I can use technology to create or improve upon something that helps others and/or my community.', 'I can teach others how to use technology responsibly and creatively.'),
    confidence: row('I can explain what I learned and how I felt about it.', 'I can recognize my strengths and areas to improve.', 'I can use what I have learned to help myself and others grow.'),
  },
  '7-8': {
    self_directed: row('I can set goals with support and manage parts of a project on my own.', 'I can plan and complete authentic projects that meet community needs.', 'I model initiative, help organize my team, and take responsibility for my learning.'),
    ethical_problem_solving: row('I can recognize challenges and think of fair ways to solve them.', 'I can analyze problems and choose ethical solutions that consider others.', 'I guide others in solving problems responsibly and advocate for fairness.'),
    collaboration: row('I guide others in solving problems responsibly and advocate for fairness.', "I can collaborate effectively by valuing others' strengths and perspectives..", 'I can lead collaboration by organizing roles and helping others succeed.'),
    research: row('I can gather and summarize information from reliable sources.', 'I can analyze and apply research to support a project or solution.', 'I can evaluate data and explain how it impacts or work or community.'),
    communication: row('I can share ideas clearly with my team and facilitator.', 'I can communicate effectivley with different audiences using various tools.', 'I can lead presentations and help others improve their communication.'),
    technology: row('I can use technology to support my learning and projects.', 'I can apply technology to design authentic community solutions.', 'I can train others and use technology responsibly to make an impact.'),
    confidence: row('I can reflect on my progress and identify growth areas.', 'I can evaluate my pact and set new goals for improvement.', 'I can model reflection and help others grow through feedback.'),
  },
  '9-12': {
    self_directed: row('I can set goals with support and manage parts of a project on my own.', 'I can independently plan, organize, and complete a project that meets authentic needs.', 'I model initiative, manage my own learning, and support others in reaching shared goals.'),
    ethical_problem_solving: row('I can recognize challenges and identify fair solutions.', 'I can analyze complex problems and make ethical choices that respect others and the community.', 'I guide my peers in solving problems responsibly and advocate for ethical action in real-world situations.'),
    collaboration: row('I can contribute my ideas and complete my assigned tasks.', "I collaborate effectivley, valuing others' strengths and helping my team meet our goals.", 'I lead collaboration by organizing roles, resolving conflict, and mentoring others to succeed.'),
    research: row('I can gather and summarize information from credible sources.', 'I can analyze, apply, and evaluate research to support a project or community solution.', 'I conduct advanced research, synthesize data, and evaluate impact to inform long-term outcomes.'),
    communication: row('I can share ideas clearly with peers and facilitators.', 'I can communicate effectively with diverse audiences using multiple formats.', 'I am able to deliver professional presentations and adapt communication for clients, stakeholders, and public audiences.'),
    technology: row('I can use technology to support my learning and projects.', 'I can apply technology to design and implement authentic solutions to community challenges. ats.', 'I innovate with technology to create meaningful change and train others to use tools responsibly.'),
    confidence: row('I can reflect on my progress and areas for improvement.', 'I can evaluate my growth, celebrate successes, and make plans to improve my impact.', 'I lead through reflection, using my experiences to mentor others and model lifelong learning.'),
  },
};

export function gradeBandFor(grade) {
  if (grade >= 9) return '9-12';
  if (grade >= 7) return '7-8';
  if (grade >= 3) return '3-6';
  if (grade >= 0) return 'K-2';
  return null;
}