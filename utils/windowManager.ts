import { useRuntimeStore } from '../store/useStore';

export const startPerformance = async (
    songId: string, 
    queue: string[] | null, 
    navigate: (path: string, options?: any) => void, 
    returnPath?: string
) => {
    // 1. Update global state
    const setPerformanceQueue = useRuntimeStore.getState().setPerformanceQueue;
    const setActivePerformSongId = useRuntimeStore.getState().setActivePerformSongId;
    const setCurrentLineIndex = useRuntimeStore.getState().setCurrentLineIndex;
    const setBlackout = useRuntimeStore.getState().setBlackout;

    setPerformanceQueue(queue);
    setActivePerformSongId(songId);
    setCurrentLineIndex(0);
    setBlackout(false);

    // 2. Open the window synchronously to bypass popup blockers
    // Using window.location.pathname correctly preserves base paths like /LiveLyricist/ on GitHub Pages
    const baseUrl = window.location.origin + window.location.pathname;
    const audienceWindow = window.open(`${baseUrl}#/audience`, 'LivelyricistAudience', 'width=1024,height=768');

    // 3. Navigate the local window FIRST so the user sees a reaction instantly
    navigate(`/perform/${songId}`, { state: { returnPath }});

    // 4. Try to move the Audience view to an external monitor automatically
    try {
        if ('getScreenDetails' in window) {
            // @ts-ignore
            const screenDetails = await window.getScreenDetails();
            // @ts-ignore
            const externalScreen = screenDetails.screens.find(s => s !== screenDetails.currentScreen);
            
            if (externalScreen && audienceWindow) {
                audienceWindow.moveTo(externalScreen.availLeft, externalScreen.availTop);
                audienceWindow.resizeTo(externalScreen.availWidth, externalScreen.availHeight);
            }
        }
    } catch (error) {
        console.log("No screen details permission or API not supported: ", error);
    }
};
