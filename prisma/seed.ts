import { PrismaClient, ArticleStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required for seeding');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const editorPassword = await bcrypt.hash('editor123', 10);

  // Clear child records first to satisfy FK constraints.
  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const [admin, editor] = await Promise.all([
    prisma.user.create({
      data: {
        login: 'ny_news_admin',
        password: adminPassword,
        role: UserRole.ADMIN,
      },
    }),
    prisma.user.create({
      data: {
        login: 'ny_news_editor',
        password: editorPassword,
        role: UserRole.EDITOR,
      },
    }),
  ]);

  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Metro',
        description: 'Local New York city and borough coverage',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Politics',
        description: 'City and state politics and public policy',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Culture',
        description: 'Arts, books, and cultural life in New York',
      },
    }),
  ]);

  const tagNames = [
    'cityhall',
    'subway',
    'housing',
    'elections',
    'broadway',
    'transit',
    'budget',
    'schools',
    'public-safety',
    'small-business',
    'parks',
    'health',
  ];
  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.create({
        data: { name },
      }),
    ),
  );
  const tagsByName = new Map(tags.map((tag) => [tag.name, tag]));

  const categoriesByName = new Map(categories.map((category) => [category.name, category]));
  const storyDrafts = [
    {
      categoryName: 'Metro',
      tags: ['subway', 'transit', 'public-safety'] as const,
      title: 'F Train Weekend Fixes Cut Delays, but Riders Fear Another Slow Summer',
      content:
        'Transit crews finished three weekends of tunnel signal repairs between Jay Street and Bergen Street, trimming average wait times by six minutes in weekday peaks. Riders praised the smoother service but said overcrowded platforms have returned and asked the MTA to publish a summer contingency schedule before beach traffic spikes.',
    },
    {
      categoryName: 'Politics',
      tags: ['cityhall', 'budget', 'schools'] as const,
      title: 'Council Restores Librarian Hiring Line After Parents Packed Budget Hearing',
      content:
        'A late-night budget hearing ended with the City Council restoring $18 million for school and branch librarian hires that had been marked for cuts. Parent advocates from Queens and the Bronx said the compromise matters less on paper and more in whether schools can fill bilingual positions by September.',
    },
    {
      categoryName: 'Culture',
      tags: ['broadway', 'small-business', 'parks'] as const,
      title: 'Bronx Summer Stage Season Expands Into Two Neighborhood Parks',
      content:
        'The borough arts council announced a larger summer theater slate with evening performances at Crotona Park and Soundview Park, plus reduced vendor fees for nearby food stalls. Organizers said the expansion is meant to keep ticket prices low while giving small neighborhood businesses predictable weekend foot traffic.',
    },
    {
      categoryName: 'Metro',
      tags: ['housing', 'public-safety', 'health'] as const,
      title: 'After Two Fatal Fires, Harlem Buildings Face New Smoke Door Checks',
      content:
        'FDNY inspectors began unannounced smoke-door compliance checks in a cluster of Harlem apartment buildings after two fatal hallway fires this spring. Tenant leaders welcomed the urgency but asked city agencies to pair enforcement with grants for older buildings that cannot absorb retrofit costs.',
    },
    {
      categoryName: 'Politics',
      tags: ['elections', 'cityhall', 'health'] as const,
      title: 'Board of Elections Tests Mobile Check-In Pilot at Three Senior Centers',
      content:
        'Election officials launched a small mobile check-in trial at senior centers in Brooklyn, Queens, and Staten Island to reduce long lines on early-voting days. Public health groups monitoring turnout said the pilot could raise participation if transportation support is funded through November.',
    },
    {
      categoryName: 'Culture',
      tags: ['small-business', 'parks', 'health'] as const,
      title: 'Jackson Heights Night Market Returns With New Safety and Noise Rules',
      content:
        'The Jackson Heights night market reopened with tighter closing-hour limits, on-site medics, and a redesigned vendor map that keeps cooking smoke away from nearby residential entrances. Food stall owners said the layout is more manageable, though smaller operators worry the permit deposit remains too high.',
    },
    {
      categoryName: 'Metro',
      tags: ['transit', 'subway', 'small-business'] as const,
      title: 'Staten Island Ferry Freight Trial Gives Corner Stores Earlier Deliveries',
      content:
        'A new dawn ferry freight slot allowed wholesalers to move produce and dairy shipments before commuter crowds, cutting delivery delays for dozens of North Shore stores. Business owners said the pilot eased spoilage costs but warned it will fail without reliable truck loading windows at both terminals.',
    },
    {
      categoryName: 'Politics',
      tags: ['budget', 'housing', 'cityhall'] as const,
      title: 'City Hall Redirects Vacant Lot Funds to Emergency Tenant Repairs',
      content:
        'The administration shifted $42 million from delayed vacant-lot acquisitions into emergency repairs for occupied buildings with recurring heat and mold violations. Housing organizers called the move overdue and asked for block-level reporting so tenants can track whether contractors actually complete work.',
    },
    {
      categoryName: 'Culture',
      tags: ['broadway', 'schools', 'small-business'] as const,
      title: 'After-School Playwriting Program Links Queens Teens With Off-Broadway Mentors',
      content:
        'A new arts education partnership pairs public high school students with playwrights and stage managers from off-Broadway companies for a ten-week workshop cycle. Program coordinators said local print shops and costume suppliers will also benefit because each school stages a neighborhood showcase.',
    },
    {
      categoryName: 'Metro',
      tags: ['parks', 'public-safety', 'health'] as const,
      title: 'Heat Wave Plan Adds Overnight Cooling Access in Five Recreation Centers',
      content:
        'City emergency managers activated overnight cooling access in five recreation centers after forecasters warned of three consecutive days above 95 degrees. Outreach workers said the larger challenge is not space but transportation, since many high-risk residents cannot safely travel after sunset.',
    },
    {
      categoryName: 'Politics',
      tags: ['cityhall', 'elections', 'budget'] as const,
      title: 'Public Matching Funds Board Flags Late Filings in Four Competitive Races',
      content:
        'Campaign finance auditors flagged four council campaigns for repeated late filings tied to missing subcontractor invoices and incomplete donor attestations. Election watchdogs said the violations are fixable now, but they want automatic penalties before absentee ballots go out next month.',
    },
    {
      categoryName: 'Culture',
      tags: ['parks', 'small-business', 'public-safety'] as const,
      title: 'Prospect Park Weekend Dance Series Draws Crowds and New Street Vendor Caps',
      content:
        'The summer dance series in Prospect Park drew record attendance during its first two weekends, prompting Parks to cap unlicensed vendor spots near two main entrances. Nearby merchants support better crowd flow, while performers say stricter street rules should not push out long-running community groups.',
    },
    {
      categoryName: 'Metro',
      tags: ['subway', 'transit', 'schools'] as const,
      title: 'Student MetroCard Sync Bug Leaves Hundreds Without Monday Morning Access',
      content:
        'A software sync issue in the student fare system temporarily disabled active MetroCards for hundreds of middle and high school riders during Monday rush hour. MTA officials restored access by noon and said they are adding a weekend verification run to prevent repeat lockouts.',
    },
    {
      categoryName: 'Politics',
      tags: ['housing', 'budget', 'health'] as const,
      title: 'Council Committee Approves Mold Remediation Reserve for NYCHA Towers',
      content:
        'Council members approved a dedicated reserve fund for mold remediation in older public housing towers after residents submitted months of humidity and leak logs. Tenant associations said the vote is a first step and asked for independent post-repair inspections in every development.',
    },
    {
      categoryName: 'Culture',
      tags: ['broadway', 'parks', 'schools'] as const,
      title: 'Shakespeare in the Courtyards Tour Brings Free Shows to Public Schools',
      content:
        'A nonprofit theater consortium announced a borough-wide courtyard tour that will stage condensed Shakespeare productions on public school grounds through October. Organizers said student matinees are designed to align with curriculum units so teachers can use performance notes in class.',
    },
    {
      categoryName: 'Metro',
      tags: ['public-safety', 'transit', 'cityhall'] as const,
      title: 'DOT Lowers Speed Limits on Three Bus Corridors After Injury Spike',
      content:
        'Transportation officials lowered posted speeds on three high-volume bus corridors in the Bronx and central Brooklyn after crash injury rates rose during winter. Driver unions said enforcement cameras must be paired with clearer curb regulations to avoid unsafe lane weaving at delivery stops.',
    },
    {
      categoryName: 'Politics',
      tags: ['cityhall', 'budget', 'parks'] as const,
      title: 'Comptroller Audit Finds Delays in Tree Planting Contracts Citywide',
      content:
        'A comptroller audit found that tree planting contracts in every borough missed milestone deadlines, often because procurement approvals were issued after planting season closed. City Hall said it accepts the findings and will publish quarterly maps showing when each contract reaches completion.',
    },
    {
      categoryName: 'Culture',
      tags: ['small-business', 'health', 'parks'] as const,
      title: 'Sunset Park Food Co-op Opens Community Kitchen for Weekend Pop-Ups',
      content:
        'The Sunset Park food cooperative opened a shared commercial kitchen that allows neighborhood cooks to run weekend pop-ups under one low-cost permit umbrella. Health inspectors praised the training model, while co-op members said scaling will depend on cold-storage grants for new vendors.',
    },
    {
      categoryName: 'Metro',
      tags: ['housing', 'schools', 'public-safety'] as const,
      title: 'Families in Temporary Hotels Push for Safer Routes to Nearby Schools',
      content:
        'Parents living in temporary hotel placements asked the city to add crossing guards and marked pickup zones around schools now serving displaced students. Education officials said route reviews are underway, but families want immediate short-term staffing before another semester starts.',
    },
    {
      categoryName: 'Politics',
      tags: ['elections', 'cityhall', 'schools'] as const,
      title: 'Candidate Forums Shift to Public School Gyms to Boost Evening Attendance',
      content:
        'Several district candidate forums moved from civic offices to public school gyms this cycle, leading to larger evening crowds and more youth participation. Organizers said the format works because it offers translation services and childcare in spaces residents already trust.',
    },
    {
      categoryName: 'Culture',
      tags: ['broadway', 'small-business', 'health'] as const,
      title: 'Union City Actors Launch Wellness Fund for Contract Gaps Between Shows',
      content:
        'A coalition of stage performers and union representatives created a wellness fund for actors navigating unpaid gaps between short production contracts. The fund is supported by small ticket surcharges and matching donations from theater district restaurants and retailers.',
    },
    {
      categoryName: 'Metro',
      tags: ['subway', 'public-safety', 'health'] as const,
      title: 'Mental Health Teams Join Late-Night Station Outreach in Midtown',
      content:
        'City-funded mental health teams began overnight outreach inside three Midtown stations where shelter referrals and emergency calls have climbed. Transit workers said the first week reduced confrontation incidents, but teams still need stable indoor placement options to keep progress.',
    },
    {
      categoryName: 'Politics',
      tags: ['budget', 'cityhall', 'health'] as const,
      title: 'Health Department Defends Clinic Consolidation Plan at Packed Hearing',
      content:
        'Health officials defended a clinic consolidation plan that would merge administrative operations while keeping walk-in services in affected neighborhoods. Council members pressed for clearer staffing guarantees and a published travel-time analysis before approving the next budget transfer.',
    },
    {
      categoryName: 'Culture',
      tags: ['parks', 'schools', 'small-business'] as const,
      title: 'Queens Mural Program Pairs Student Artists With Corridor Merchants',
      content:
        'A Queens mural program linked high school art clubs with corridor merchants to repaint boarded storefronts and underused lot walls. Teachers said students gained paid summer hours, and shop owners reported improved weekend foot traffic along two previously quiet blocks.',
    },
    {
      categoryName: 'Metro',
      tags: ['transit', 'subway', 'budget'] as const,
      title: 'Bus Depot Electrification Faces Delay as Cable Contract Bids Come in High',
      content:
        'The city delayed the final phase of a bus depot electrification project after power-cable bids arrived well above engineering estimates. Transit advocates said service goals remain achievable if officials sequence charger installations by route demand instead of political district boundaries.',
    },
    {
      categoryName: 'Politics',
      tags: ['housing', 'cityhall', 'public-safety'] as const,
      title: 'Council Advances Basement Apartment Legalization Framework With Safety Triggers',
      content:
        'A revised basement apartment legalization proposal moved forward with stricter flood sensors, secondary exits, and annual inspection requirements. Homeowner groups said legalization helps affordability, but tenant advocates want anti-retaliation protections written directly into permit rules.',
    },
    {
      categoryName: 'Culture',
      tags: ['broadway', 'parks', 'elections'] as const,
      title: 'Election-Year Satire Festival Returns to Public Plazas Across Manhattan',
      content:
        'A long-running satire festival returns this fall with free performances in three Manhattan plazas and a new youth comedy writing contest. Producers said civic themes are resonating with younger audiences, especially when post-show panels explain policy issues in plain language.',
    },
    {
      categoryName: 'Metro',
      tags: ['schools', 'public-safety', 'health'] as const,
      title: 'Asthma Alerts Prompt School Bus Reroutes Away From Two Freight Arteries',
      content:
        'School transportation planners rerouted several bus lines away from two freight-heavy corridors after local clinics reported rising pediatric asthma visits. Families applauded the change but asked for air-quality sensors near playgrounds to monitor whether exposure actually declines.',
    },
    {
      categoryName: 'Politics',
      tags: ['budget', 'parks', 'cityhall'] as const,
      title: 'Participatory Budget Ballot Adds Park Lighting and Restroom Repairs',
      content:
        'This cycle\'s participatory budget ballot includes dozens of small park lighting projects and overdue restroom upgrades in all five boroughs. Community boards said residents consistently prioritize practical maintenance over major capital builds when they vote directly on projects.',
    },
    {
      categoryName: 'Culture',
      tags: ['small-business', 'health', 'schools'] as const,
      title: 'Culinary Apprenticeship Network Helps Immigrant Bakers Enter School Cafeterias',
      content:
        'A city-backed culinary apprenticeship network is helping immigrant-owned bakeries meet procurement and nutrition rules for public school contracts. Participants said the process remains paperwork-heavy, but shared legal clinics have reduced common compliance mistakes.',
    },
    {
      categoryName: 'Metro',
      tags: ['subway', 'transit', 'elections'] as const,
      title: 'Early Voting Week Prompts Additional Trains on Two Outer-Borough Lines',
      content:
        'Transit planners scheduled extra early-morning trains on two outer-borough lines during early voting to prevent station bottlenecks near major poll sites. Election volunteers said reliable service matters most for older voters who rely on predictable transfer times.',
    },
    {
      categoryName: 'Politics',
      tags: ['cityhall', 'housing', 'budget'] as const,
      title: 'Mayor Proposes Vacant Office Conversion Tax Credit for Mixed-Income Housing',
      content:
        'City Hall introduced a tax credit plan to convert aging office floors into mixed-income housing, prioritizing buildings near frequent transit corridors. Housing analysts said the incentive could work if affordability terms stay in place for at least thirty years.',
    },
    {
      categoryName: 'Culture',
      tags: ['parks', 'small-business', 'broadway'] as const,
      title: 'Waterfront Puppet Festival Draws Family Crowds to Staten Island',
      content:
        'The Staten Island waterfront puppet festival drew large family crowds and sold out every afternoon workshop during its opening weekend. Event managers said nearby cafes and bookstores reported one of their strongest Saturday sales periods outside holiday season.',
    },
    {
      categoryName: 'Metro',
      tags: ['public-safety', 'health', 'cityhall'] as const,
      title: '911 Call Triage Pilot Sends More Nonviolent Cases to Crisis Teams',
      content:
        'A new 911 triage protocol routed a larger share of nonviolent behavioral health calls to specialized crisis teams rather than patrol units. Public safety officials said response times improved modestly, though neighborhood groups want independent oversight of dispatch outcomes.',
    },
    {
      categoryName: 'Politics',
      tags: ['elections', 'schools', 'budget'] as const,
      title: 'Civic Education Grant Expands Student Poll Worker Training',
      content:
        'A civic education grant will fund expanded poll worker training in public high schools, with paid placements during primary and general election periods. Teachers said practical election work keeps students engaged better than lecture-only civics classes.',
    },
    {
      categoryName: 'Culture',
      tags: ['broadway', 'parks', 'health'] as const,
      title: 'Dance Therapy Residency Brings Free Workshops to Senior Centers',
      content:
        'A dance therapy residency led by Broadway choreographers launched free weekly workshops in senior centers across upper Manhattan and the Bronx. Program staff said attendance remains strongest where sessions are paired with transportation support and on-site meals.',
    },
    {
      categoryName: 'Metro',
      tags: ['housing', 'budget', 'health'] as const,
      title: 'City Expands Lead Pipe Replacements Near Childcare Hubs',
      content:
        'The city accelerated lead service line replacements around licensed childcare centers after environmental screening identified clusters of older plumbing connections. Parents welcomed the expansion and asked for multilingual notices before sidewalk excavation begins on residential blocks.',
    },
    {
      categoryName: 'Politics',
      tags: ['cityhall', 'public-safety', 'health'] as const,
      title: 'Council Seeks Monthly Reporting on Overdose Response Times',
      content:
        'Council health and public safety committees jointly requested monthly response-time dashboards for overdose calls, broken down by district and time of day. Officials said stronger data transparency could guide naloxone placement and mobile team staffing decisions.',
    },
    {
      categoryName: 'Culture',
      tags: ['small-business', 'parks', 'schools'] as const,
      title: 'Neighborhood Book Fair Circuit Pairs Authors With Local School Choirs',
      content:
        'A rotating neighborhood book fair circuit launched with local author talks, student choir performances, and reduced booth fees for independent sellers. Organizers said blending cultural events with school partnerships helps draw families who might not attend standalone fairs.',
    },
    {
      categoryName: 'Metro',
      tags: ['transit', 'public-safety', 'schools'] as const,
      title: 'Queens Intersections Get New Daylighting Rules Around School Crossings',
      content:
        'Transportation officials installed daylighting treatments at twenty intersections near school crossings in central Queens, removing parking closest to corners. Crossing guards said visibility improved immediately, though they want stronger enforcement during morning drop-off rush.',
    },
    {
      categoryName: 'Politics',
      tags: ['budget', 'housing', 'cityhall'] as const,
      title: 'Budget Negotiators Add Rent Arrears Aid for Working Families',
      content:
        'Final budget talks added a targeted rent arrears package for working families who earn above emergency shelter thresholds but still face eviction filings. Legal service providers said the key test is whether applications can be approved quickly enough to stop housing court lockouts.',
    },
    {
      categoryName: 'Culture',
      tags: ['broadway', 'small-business', 'schools'] as const,
      title: 'Technical Theater Bootcamp Trains Teens for Union Apprenticeships',
      content:
        'A new technical theater bootcamp is training public school students in lighting, rigging, and sound systems with direct pathways into union apprenticeships. Theater owners said the program also strengthens the local production workforce during peak touring season.',
    },
    {
      categoryName: 'Metro',
      tags: ['subway', 'health', 'public-safety'] as const,
      title: 'Platform Ventilation Upgrade Begins at Four Deep Stations',
      content:
        'Construction crews started ventilation upgrades at four deep stations where summer heat indexes regularly exceed safe comfort ranges on crowded platforms. Riders welcomed cooler air goals but asked agencies to limit weekend shutdown overlap with nearby maintenance work.',
    },
    {
      categoryName: 'Politics',
      tags: ['elections', 'cityhall', 'parks'] as const,
      title: 'Campaign Season Advertising Rules Tightened for Park Conservancies',
      content:
        'City ethics officials tightened campaign-season advertising rules for events hosted by park conservancies, requiring clearer sponsorship disclosures. Reform groups said the update closes loopholes that blurred lines between civic fundraising and political messaging.',
    },
    {
      categoryName: 'Culture',
      tags: ['parks', 'health', 'small-business'] as const,
      title: 'Community Drum Circle Program Adds Trauma-Informed Facilitator Training',
      content:
        'A citywide drum circle initiative expanded facilitator training to include trauma-informed practices after participant surveys requested more emotional support tools. Park managers said the updated sessions still keep the open, low-barrier format that made the program popular.',
    },
    {
      categoryName: 'Metro',
      tags: ['housing', 'public-safety', 'parks'] as const,
      title: 'East River Flood Barrier Drills Highlight Gaps Near NYCHA Campuses',
      content:
        'Flood barrier drills along the East River exposed maintenance gaps near several public housing campuses where evacuation routes remain poorly marked. Resident leaders asked for annual multilingual drills and better wayfinding signs before peak storm season arrives.',
    },
    {
      categoryName: 'Politics',
      tags: ['cityhall', 'schools', 'budget'] as const,
      title: 'School Construction Tracker Goes Public After Years of Closed Reports',
      content:
        'City agencies published a long-requested school construction tracker showing design approvals, contractor milestones, and expected classroom openings by district. Parent coalitions called the portal a major transparency win but said timelines still need clearer delay explanations.',
    },
    {
      categoryName: 'Culture',
      tags: ['broadway', 'health', 'parks'] as const,
      title: 'Open-Air Opera Series Expands Accessible Seating and Captioning',
      content:
        'The open-air opera series announced expanded wheelchair seating zones, live captioning, and sensory-friendly matinees for this season\'s productions. Disability advocates said the upgrades show how large outdoor arts events can remain inclusive without raising ticket costs.',
    },
    {
      categoryName: 'Metro',
      tags: ['transit', 'subway', 'budget'] as const,
      title: 'Fare Evasion Enforcement Shifts to Data-Led Hotspot Rotations',
      content:
        'Transit enforcement teams shifted to rotating hotspot deployments guided by weekly fare-gate incident data rather than fixed station assignments. Policy analysts said the model may reduce uneven policing if agencies publish safeguards and independent review metrics.',
    },
    {
      categoryName: 'Politics',
      tags: ['housing', 'cityhall', 'health'] as const,
      title: 'Supportive Housing Provider Contracts Gain New Clinical Staffing Floors',
      content:
        'Renewed supportive housing contracts now require minimum on-site clinical staffing levels after residents reported long waits for behavioral health appointments. Providers said the standards are sensible but urged city agencies to speed reimbursement cycles.',
    },
    {
      categoryName: 'Culture',
      tags: ['small-business', 'schools', 'parks'] as const,
      title: 'Neighborhood Print Shops Win Bid to Produce Student Arts Festival Materials',
      content:
        'A cooperative of neighborhood print shops won a city bid to produce signage, programs, and posters for the student arts festival season. School organizers said local sourcing improved turnaround times and kept festival spending inside community business corridors.',
    },
    {
      categoryName: 'Metro',
      tags: ['schools', 'public-safety', 'cityhall'] as const,
      title: 'Cross-Borough School Commute Pilot Adds Real-Time Family Alerts',
      content:
        'A cross-borough commute pilot now sends real-time route alerts to families when school bus arrivals change by more than ten minutes. Parents said the alerts reduce missed pickups, especially for caregivers balancing shift work and multiple school schedules.',
    },
    {
      categoryName: 'Politics',
      tags: ['budget', 'elections', 'cityhall'] as const,
      title: 'Civic Technology Office Opens Open-Data Grants for Election Tools',
      content:
        'The civic technology office launched a small grant round for nonprofit tools that simplify ballot information and polling place lookup data. Election administrators said open standards could reduce confusion if products stay accessible on low-bandwidth mobile connections.',
    },
  ] as const;
  const statuses: ArticleStatus[] = [
    ...Array.from({ length: 36 }, () => ArticleStatus.PUBLISHED),
    ...Array.from({ length: 8 }, () => ArticleStatus.DRAFT),
    ...Array.from({ length: 6 }, () => ArticleStatus.ARCHIVED),
  ];
  if (storyDrafts.length !== statuses.length) {
    throw new Error(
      `Expected storyDrafts and statuses to have the same length (${statuses.length}), got ${storyDrafts.length}.`,
    );
  }

  const articleSeeds = storyDrafts.map((story, i) => {
    const category = categoriesByName.get(story.categoryName)!;
    const status = statuses[i];
    const authorId = i % 2 === 0 ? admin.id : editor.id;

    return {
      title: story.title,
      content: story.content,
      status,
      authorId,
      categoryId: category.id,
      tags: story.tags.map((name) => ({ id: tagsByName.get(name)!.id })),
    };
  });

  const articles = await Promise.all(
    articleSeeds.map((seed) =>
      prisma.article.create({
        data: {
          title: seed.title,
          content: seed.content,
          status: seed.status,
          authorId: seed.authorId,
          categoryId: seed.categoryId,
          tags: {
            connect: seed.tags,
          },
        },
      }),
    ),
  );

  await Promise.all(
    articles.slice(0, 12).map((article, i) =>
      prisma.comment.create({
        data: {
          content: `Reader note ${i + 1}: useful context with clear local implications.`,
          articleId: article.id,
          authorId: i % 2 === 0 ? editor.id : admin.id,
        },
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
