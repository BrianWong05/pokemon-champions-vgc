## ADDED Requirements

### Requirement: Recursive Directory Creation
The system SHALL automatically create the destination directories `public/images/pokemon/official-artwork/` and `public/images/pokemon/thumbnails/` if they do not exist.

#### Scenario: Running on fresh project
- **WHEN** the script is executed for the first time
- **THEN** the required destination directories SHALL be created before image processing begins.

### Requirement: Image Migration
The system SHALL copy original `.png` images from the source directory to the high-resolution destination directory.

#### Scenario: Copying assets
- **WHEN** a valid `.png` file exists in `official-artwork/`
- **THEN** an identical copy SHALL be placed in `public/images/pokemon/official-artwork/`.

### Requirement: Robust Processing
The system SHALL process all images in the source directory and SHALL NOT terminate early if an individual file is corrupted or fails to process.

#### Scenario: Handling corrupted images
- **WHEN** a corrupted image file is encountered
- **THEN** the system SHALL log the error and continue to the next image file.
