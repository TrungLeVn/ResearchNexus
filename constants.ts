







import { Project, ProjectStatus, Idea, Reminder, Collaborator, Course, MeetingNote } from './types';

export const MOCK_USERS: Collaborator[] = [
    { id: 'c1', name: 'Assoc.Prof. Trung Le', email: 'trung.le@university.edu', role: 'Owner', initials: 'TL' },
    { id: 'c2', name: 'Dr. Ada Lovelace', email: 'ada.l@university.edu', role: 'Editor', initials: 'AL' }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Neural Architecture Search Optimization',
    description: 'Investigating evolutionary algorithms for optimizing deep learning architectures in resource-constrained environments.',
    status: ProjectStatus.ACTIVE,
    progress: 65,
    tags: ['AI', 'Optimization', 'Deep Learning'],
    notes: [
        { id: 'pn1', title: 'Initial Thoughts', content: 'Focus on MobileNet variants. Check latest survey paper.', color: 'yellow', createdAt: new Date().toISOString() },
        { id: 'pn2', title: 'To-Do', content: '- Setup Conda Env\n- Download ImageNet subset', color: 'blue', createdAt: new Date().toISOString() }
    ],
    category: 'research',
    collaborators: [
        MOCK_USERS[0],
        MOCK_USERS[1]
    ],
    tasks: [
        { 
            id: 't1', 
            title: 'Run benchmarks on ImageNet', 
            status: 'in_progress', 
            priority: 'high', 
            dueDate: '2024-06-15', 
            assigneeIds: ['c1', 'c2'],
            description: 'Use the latest version of the evolutionary algorithm to run a full benchmark on the ImageNet validation set. Record top-1 and top-5 accuracy.',
            comments: [
                { id: 'tc1', authorId: 'c1', authorName: 'Assoc.Prof. Trung Le', authorInitials: 'TL', text: 'Make sure to use the correct GPU drivers for this.', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() }
            ]
        },
        { 
            id: 't2', 
            title: 'Draft methodology section', 
            status: 'done', 
            priority: 'medium', 
            dueDate: '2024-05-20', 
            assigneeIds: ['c1'],
            description: 'Write up the first version of the methodology chapter for the upcoming paper submission. Focus on clarity and reproducibility.'
        },
        { 
            id: 't3', 
            title: 'Clean up code repository', 
            status: 'todo', 
            priority: 'low', 
            dueDate: '2024-06-20', 
            assigneeIds: ['c1'],
            description: 'Refactor all Python scripts, add docstrings, and ensure the README is up to date for public release.'
        }
    ],
    files: [
        { id: 'f1', name: 'Experiment Logs v1', type: 'data', lastModified: '2024-05-10', url: 'https://drive.google.com/...' },
        { id: 'f2', name: 'Evolutionary_Algo.py', type: 'code', lastModified: '2024-05-12', url: 'https://drive.google.com/...' },
        { id: 'f3', name: 'Manuscript Draft v2.docx', type: 'draft', lastModified: '2024-06-01', url: 'https://drive.google.com/...' },
        { id: 'f4', name: 'Conference Slides.pptx', type: 'slide', lastModified: '2024-06-05', url: 'https://drive.google.com/...' },
        { id: 'f5', name: 'Grant Application.pdf', type: 'document', lastModified: '2024-04-20', url: 'https://drive.google.com/...' }
    ],
    papers: [
      {
        id: 'p1',
        title: 'EfficientNet: Rethinking Model Scaling for Convolutional Neural Networks',
        authors: 'Tan, M., & Le, Q.',
        year: 2019,
        status: 'Annotated',
        summary: 'Proposes a compound scaling method that uniformly scales network width, depth, and resolution.',
        url: '#'
      },
      {
        id: 'p2',
        title: 'Neural Architecture Search: A Survey',
        authors: 'Elsken, T., et al.',
        year: 2019,
        status: 'Reading',
        url: '#'
      }
    ],
    activity: [
        { id: 'a3', message: 'completed task: \'Draft methodology section\'', timestamp: new Date(Date.now() - 86400000 * 7).toISOString(), authorId: 'c1' },
        { id: 'a2', message: 'added file: \'Experiment Logs v1\'', timestamp: new Date(Date.now() - 86400000 * 14).toISOString(), authorId: 'c1' },
        { id: 'a1', message: 'created the project.', timestamp: new Date(Date.now() - 86400000 * 30).toISOString(), authorId: 'c1' }
    ]
  },
  {
    id: '2',
    title: 'Climate Change Impact on Crop Yields',
    description: 'Statistical modeling of temperature variations and their correlation with wheat production in Northern Europe.',
    status: ProjectStatus.PLANNING,
    progress: 15,
    tags: ['Climate', 'Agriculture', 'Statistics'],
    category: 'research',
    notes: [],
    collaborators: [
        MOCK_USERS[0]
    ],
    tasks: [
        { id: 't4', title: 'Literature review on wheat yields', status: 'in_progress', priority: 'medium', dueDate: '2024-07-01', assigneeIds: ['c1'] },
        { id: 't5', title: 'Acquire historical weather data', status: 'todo', priority: 'high', dueDate: '2024-07-10', assigneeIds: ['c1'] }
    ],
    files: [],
    papers: [],
    activity: [
        { id: 'a4', message: 'created the project.', timestamp: new Date().toISOString(), authorId: 'c1' }
    ]
  },
  {
    id: 'admin1',
    title: 'International AI Conference 2024 Organization',
    description: 'Organizing committee tasks for the upcoming department conference.',
    status: ProjectStatus.ACTIVE,
    progress: 40,
    tags: ['Conference', 'Admin', 'Event'],
    category: 'admin',
    notes: [],
    collaborators: [MOCK_USERS[0]],
    tasks: [
        { id: 'at1', title: 'Book Keynote Speaker', status: 'done', priority: 'high', dueDate: '2024-05-01', assigneeIds: ['c1'] },
        { id: 'at2', title: 'Finalize Catering Menu', status: 'in_progress', priority: 'medium', dueDate: '2024-06-01', assigneeIds: ['c1'] },
        { id: 'at3', title: 'Send Call for Papers', status: 'todo', priority: 'high', dueDate: '2024-06-15', assigneeIds: ['c1'] }
    ],
    files: [],
    papers: [],
    activity: []
  }
];

export const MOCK_COURSES: Course[] = [
    { 
        id: '1', 
        code: 'CS101', 
        name: 'Intro to Computer Science', 
        semester: 'Fall 2024', 
        studentsCount: 120, 
        scheduleDay: 'Mon',
        scheduleTime: '10:00',
        durationMins: 90,
        room: 'Lecture Hall A',
        isArchived: false,
        resources: {
            syllabus: 'https://drive.google.com/syllabus',
            grades: 'https://drive.google.com/grades',
            slides: 'https://drive.google.com/slides',
            exercises: 'https://drive.google.com/exercises'
        }
    },
    { 
        id: '2', 
        code: 'AI302', 
        name: 'Advanced Machine Learning', 
        semester: 'Fall 2024', 
        studentsCount: 45, 
        scheduleDay: 'Wed',
        scheduleTime: '14:00',
        durationMins: 120,
        room: 'Lab 304',
        isArchived: false,
        resources: {
            syllabus: 'https://drive.google.com/syllabus',
            slides: 'https://drive.google.com/slides',
            readings: 'https://drive.google.com/readings',
            testbank: 'https://drive.google.com/tests'
        }
    },
    { 
        id: '3', 
        code: 'CS201', 
        name: 'Data Structures', 
        semester: 'Spring 2023', 
        studentsCount: 90, 
        scheduleDay: 'Tue',
        scheduleTime: '09:00',
        durationMins: 90,
        room: 'Room 101',
        isArchived: true,
        resources: {}
    }
];

export const MOCK_MEETINGS: MeetingNote[] = [
    {
        id: 'm1',
        title: 'Department Monthly Sync',
        date: '2024-05-01',
        attendees: ['Dean', 'All Faculty'],
        content: '# Minutes\n- Discussed budget cuts.\n- Approved new AI curriculum.',
        tags: ['Department', 'General']
    },
    {
        id: 'm2',
        title: 'Curriculum Committee',
        date: '2024-05-15',
        attendees: ['Dr. Le', 'Dr. Smith'],
        content: '# CS101 Revamp\n- Switching from Java to Python.',
        tags: ['Curriculum', 'CS101']
    }
];

export const MOCK_IDEAS: Idea[] = [
  {
    id: 'i1',
    title: 'Graph Neural Networks for Drug Discovery',
    description: 'Using GNNs for molecular property prediction.',
    content: 'Can we use GNNs to predict molecular properties more accurately than standard CNNs? Need to check potential datasets like ZINC.',
    relatedResources: [
        { id: 'r1', title: 'ZINC Database', type: 'web', url: 'https://zinc.docking.org/' }
    ],
    aiEnhanced: false
  },
  {
    id: 'i2',
    title: 'Sustainable Concrete Mixtures',
    description: 'Recycled plastics in construction materials.',
    content: 'Investigating the use of recycled plastic in concrete to improve tensile strength while reducing carbon footprint.',
    relatedResources: [],
    aiEnhanced: false
  }
];

export const MOCK_REMINDERS: Reminder[] = [
    { id: 'r1', title: 'Submit grant proposal', date: new Date(Date.now() + 86400000 * 2), type: 'deadline', completed: false, projectId: '1' },
    { id: 'r2', title: 'Weekly Lab Meeting', date: new Date(Date.now() + 86400000), type: 'meeting', completed: false },
];