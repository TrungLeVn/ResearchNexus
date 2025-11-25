import { Project, ProjectStatus, Idea, Reminder, Collaborator } from './types';

export const MOCK_USERS: Collaborator[] = [
    { id: 'c1', name: 'Dr. Researcher', email: 'me@lab.edu', role: 'Owner', initials: 'DR' },
    { id: 'c2', name: 'Alice Smith', email: 'alice@lab.edu', role: 'Editor', initials: 'AS' },
    { id: 'c3', name: 'Bob Jones', email: 'bob@lab.edu', role: 'Viewer', initials: 'BJ' }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Neural Architecture Search Optimization',
    description: 'Investigating evolutionary algorithms for optimizing deep learning architectures in resource-constrained environments.',
    status: ProjectStatus.ACTIVE,
    progress: 65,
    tags: ['AI', 'Optimization', 'Deep Learning'],
    notes: 'Focusing on MobileNet variants.',
    collaborators: [
        MOCK_USERS[0], // Dr. Researcher
        MOCK_USERS[1], // Alice
        MOCK_USERS[2]  // Bob
    ],
    tasks: [
        { id: 't1', title: 'Run benchmarks on ImageNet', status: 'in_progress', priority: 'high', dueDate: '2024-06-15', assigneeId: 'c1' },
        { id: 't2', title: 'Draft methodology section', status: 'done', priority: 'medium', dueDate: '2024-05-20', assigneeId: 'c2' },
        { id: 't3', title: 'Clean up code repository', status: 'todo', priority: 'low', dueDate: '2024-06-20', assigneeId: 'c3' }
    ],
    files: [
        { id: 'f1', name: 'Experiment Logs v1', type: 'data', lastModified: '2024-05-10', url: 'https://drive.google.com/...' },
        { id: 'f2', name: 'Evolutionary_Algo.py', type: 'code', lastModified: '2024-05-12', url: 'https://drive.google.com/...' }
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
        { id: 'a1', message: 'Alice Smith uploaded "Experiment Logs v1"', time: '2 hours ago' },
        { id: 'a2', message: 'Dr. Researcher commented on "Methodology"', time: '5 hours ago' },
        { id: 'a3', message: 'Bob Jones completed task "Review Code"', time: 'Yesterday' }
    ]
  },
  {
    id: '2',
    title: 'Climate Change Impact on Crop Yields',
    description: 'Statistical modeling of temperature variations and their correlation with wheat production in Northern Europe.',
    status: ProjectStatus.PLANNING,
    progress: 15,
    tags: ['Climate', 'Agriculture', 'Statistics'],
    notes: '',
    collaborators: [
        MOCK_USERS[0] // Only Dr. Researcher
    ],
    tasks: [
        { id: 't4', title: 'Literature review on wheat yields', status: 'in_progress', priority: 'medium', dueDate: '2024-07-01', assigneeId: 'c1' },
        { id: 't5', title: 'Acquire historical weather data', status: 'todo', priority: 'high', dueDate: '2024-07-10', assigneeId: 'c1' }
    ],
    files: [],
    papers: [],
    activity: [
        { id: 'a4', message: 'Project Created', time: '1 day ago' }
    ]
  },
  {
    id: '3',
    title: 'Quantum Entanglement Protocols',
    description: 'Developing new verification protocols for multipartite entanglement in noisy quantum channels.',
    status: ProjectStatus.REVIEW,
    progress: 90,
    tags: ['Quantum Physics', 'Cryptography'],
    notes: '',
    collaborators: [
        MOCK_USERS[0], // Dr. Researcher
        { id: 'c4', name: 'Dr. Quantum', email: 'q@university.edu', role: 'Editor', initials: 'DQ' }
    ],
    tasks: [],
    files: [],
    papers: [
        {
            id: 'p3',
            title: 'Quantum Teleportation',
            authors: 'Bennett et al.',
            year: 1993,
            status: 'Annotated',
            url: '#'
        }
    ],
    activity: [
        { id: 'a5', message: 'Submitted for peer review', time: '3 days ago' }
    ]
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