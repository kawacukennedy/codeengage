import { create } from 'zustand';

interface CollaborationState {
    activeSession: string | null;
    participants: any[];
    cursorPositions: Record<string, any>;
    connectionStatus: 'connecting' | 'connected' | 'disconnected';
    chatMessages: any[];
    isRecording: boolean;
    recordingUrl: string | null;
    setSession: (token: string | null) => void;
    setParticipants: (participants: any[] | ((prev: any[]) => any[])) => void;
    updateCursor: (userId: string, position: any) => void;
    setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => void;
    addChatMessage: (message: any) => void;
    setRecording: (isRecording: boolean, url?: string | null) => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
    activeSession: null,
    participants: [],
    cursorPositions: {},
    connectionStatus: 'disconnected',
    chatMessages: [],
    isRecording: false,
    recordingUrl: null,
    setSession: (token: string | null) => set({ activeSession: token }),
    setParticipants: (update: any[] | ((prev: any[]) => any[])) => set((state) => ({
        participants: typeof update === 'function' ? update(state.participants) : update
    })),
    updateCursor: (userId: string, position: any) => set((state) => ({
        cursorPositions: { ...state.cursorPositions, [userId]: position }
    })),
    setConnectionStatus: (status: 'connecting' | 'connected' | 'disconnected') => set({ connectionStatus: status }),
    addChatMessage: (message: any) => set((state) => ({
        chatMessages: [...state.chatMessages, { ...message, timestamp: new Date() }]
    })),
    setRecording: (isRecording: boolean, url: string | null = null) => set({ isRecording, recordingUrl: url }),
}));
