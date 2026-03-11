# Movie Recommendation Algorithm

The recommendation engine provides personalized movie suggestions for the member whose turn it currently is.

## Core logic

1.  **Current Turn**: Determined by identifying the person who added the most recent movie and selecting the next person in the members list (`Tomi`, `Mikkis`, `Aino`, `Mari`).
2.  **Member Profiling**:
    *   Aggregates the member's last 20 movies.
    *   Extracts metadata: Genres, Directors, Languages, Countries, Release Decades, and Age Ratings.
    *   Frequencies are used to weight preferences.
3.  **Candidate Selection**:
    *   Excludes movies already watched by the club.
    *   Source A: Similar movies to the member's last 3 watched titles.
    *   Source B: Highly-rated movies in the member's top 3 favorite genres.
    *   Source C: Trending movies (to ensure a large candidate pool).
4.  **Scoring**:
    *   `+2` per shared genre with the member profile.
    *   `+1` if the language matches.
    *   `+1` if the release decade matches.
    *   Popularity and Vote Average are used as base scores.
5.  **Diversity (Explosions/Exploratory)**:
    *   Default `explore_fraction`: **33%**.
    *   In a typical 3-card carousel, 2 cards are highly personalized and 1 card is an exploratory pick (randomly selected from candidates to surface novelty).
6.  **Fallbacks**:
    *   If a member has < 3 movies in history, the system shows broader suggestions based on global trending data and displays a note: *"Not enough personal history — showing broader suggestions"*.

## API Usage

`GET /api/movies/recommendations?memberId=<id>&limit=3&explore_fraction=0.33`

*   `memberId`: Name of the member (e.g., "Tomi").
*   `limit`: Number of results to return (default: 3).
*   `explore_fraction`: Share of exploratory results (default: 0.33).

## Implementation Details

*   **Caching**: Metadata is cached in the `movies` table to ensure fast profiling.
*   **Deduplication**: Session-based exclusion ensures users don't see the same movie twice in one browsing session.
*   **No Collaborative Filtering**: Recommendations are strictly based on the individual member's history.
