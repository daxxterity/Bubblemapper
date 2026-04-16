# Firestore & AI Management Checklist for BubbleMapper

This checklist outlines best practices for implementing Firestore and AI features in BubbleMapper, adapted from proven patterns to minimize costs, prevent quota issues, and ensure security.

## 1. Firestore Read & Call Minimization
*Goal: Keep document reads low to stay within free tier limits and improve performance.*

- [ ] **Centralized Project Context**: Use a single React Context (e.g., `ProjectDataContext.tsx`) to manage the `onSnapshot` listener for the current map. This ensures that the Editor, PlayMode, and Sidebar all share the same data stream without triggering multiple reads for the same document.
- [ ] **Strict Query Limits**: When fetching a list of available maps/projects, always use `.limit(20)`. If nodes are stored as a sub-collection, limit initial fetches to prevent loading hundreds of nodes at once for very large maps.
- [ ] **Mandatory Listener Cleanup**: Ensure every `useEffect` that starts an `onSnapshot` listener returns its `unsubscribe` function. This prevents "leaked" listeners that continue to read data in the background after the user leaves the editor.
- [ ] **UID Scoping**: Every Firestore query must include `.where('ownerUid', '==', user.uid)`. This is required for both security and efficient indexing, ensuring users only ever interact with their own maps.
- [ ] **Composite Indexing**: Use `orderBy('updatedAt', 'desc').limit(10)` for the "Recent Projects" list to ensure you only fetch the most relevant data.

## 2. AI Token & Context Management (Gemini)
*Goal: Reduce token usage and improve AI response quality by sending only necessary data.*

- [ ] **Context Pruning (The "Node Manifest" Pattern)**: When sending the map state to Gemini for analysis or suggestions, do not send the full `NodeData` objects. Truncate `content` to 200 characters and exclude large `imageUrls` arrays unless the AI specifically needs to analyze images.
- [ ] **Just-in-Time Fetching (Function Calling)**: Instead of sending the entire sitemap in the initial prompt, provide the AI with tools like `get_node_details(nodeId)` or `list_connections(nodeId)`. The AI will then only request the specific data it needs to answer the user's query.
- [ ] **Deep Analysis Toggle**: Implement a "Deep Scan" mode for AI features. By default, send a high-level summary of the map. Only send full node details when the user explicitly enables "Thorough Analysis."

## 3. Security & Data Leak Prevention
*Goal: Protect user data and prevent resource abuse via Firestore Security Rules.*

- [ ] **Schema Enforcement**: In `firestore.rules`, use a `isValidNode()` function with `hasOnlyAllowedFields()` to prevent malicious actors from injecting arbitrary data (like `isAdmin: true`) into node documents.
- [ ] **Size Constraints**: Apply strict size checks in security rules:
    - `title.size() < 100`
    - `content.size() < 2000`
    - `imageUrls.size() < 10`
    This prevents "Resource Exhaustion" attacks where a user could try to store massive strings.
- [ ] **PII Isolation**: Ensure that sensitive user data (like email or billing info) is stored in a `users/{uid}/private/settings` document with `allow read: if isOwner(uid)` and is never mixed with public map data.

## 4. Quota & Error Resilience
*Goal: Handle Firestore limits gracefully and provide a snappy user experience.*

- [ ] **Graceful Quota Handling**: Use a centralized `handleFirestoreError` utility. If a "Quota exceeded" error occurs, display a "System at Capacity" banner instead of letting the app crash.
- [ ] **Optimistic UI Updates**: When a user moves a node or edits text, update the local `ProjectState` immediately. Perform the Firestore `updateDoc` in the background. This makes the editor feel "instant" even on slower connections.

## 5. Checklist for New Features
- [ ] Does this new screen/component need a new listener, or can it use `useProjectData()`?
- [ ] Is there a `.limit()` on the query fetching these items?
- [ ] Is the data being sent to the AI pruned to the absolute minimum required?
- [ ] Have the `firestore.rules` been updated to validate the new data structure?
