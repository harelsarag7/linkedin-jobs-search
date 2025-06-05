import puppeteer from 'puppeteer';

interface LinkedInData {
  companies: string[];
  skills: string[];
}

export async function fetchLinkedInCompaniesAndSkills(
  liAtCookie: string,
  profileUrl: string
): Promise<LinkedInData> {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  // Set the li_at cookie for authentication
  await page.setCookie({
    name: 'li_at',
    value: liAtCookie,
    domain: '.www.linkedin.com',
    path: '/',
    httpOnly: true,
    secure: true,
  });

  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });

  // Extract past companies from the Experience section
  const companies: string[] = await page.$$eval(
    'section#experience-section li .pv-entity__secondary-title',
    nodes =>
      Array.from(nodes)
        .map(node => node.textContent?.trim() || '')
        .filter(text => text.length > 0)
  );

  // Extract skills from the Skills section
  const skills: string[] = await page.$$eval(
    'span.pv-skill-category-entity__name-text',
    nodes =>
      Array.from(nodes)
        .map(node => node.textContent?.trim() || '')
        .filter(text => text.length > 0)
  );

  await browser.close();

  // Deduplicate entries
  const uniqueCompanies = Array.from(new Set(companies));
  const uniqueSkills = Array.from(new Set(skills));

  return { companies: uniqueCompanies, skills: uniqueSkills };
}
