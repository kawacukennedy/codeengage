fix: Resolve undefined variable errors in index.php

- Fix undefined $startTime and $requestId variables
- Initialize request tracking properly
- Ensure all variables are defined before use
- Add proper error handling for variable initialization

This fixes critical LSP errors in main entry point.
