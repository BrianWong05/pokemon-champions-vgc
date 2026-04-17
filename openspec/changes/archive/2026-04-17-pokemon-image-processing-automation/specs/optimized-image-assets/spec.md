## ADDED Requirements

### Requirement: Thumbnail Generation
The system SHALL generate a low-resolution thumbnail for each original image, constrained to a maximum width or height of 150px while maintaining the original aspect ratio.

#### Scenario: Resizing large artwork
- **WHEN** a 400x400 image is processed
- **THEN** a corresponding 150x150 thumbnail SHALL be generated.

### Requirement: High-Quality Resampling
The system SHALL use the `LANCZOS` resampling filter when generating thumbnails to maintain visual clarity.

#### Scenario: Visual quality check
- **WHEN** a thumbnail is created
- **THEN** the output SHALL be sharp and free of significant aliasing artifacts.

### Requirement: Web Optimization
The system SHALL optimize thumbnails for web delivery, including transparency preservation and file size reduction.

#### Scenario: Transparent background
- **WHEN** the source image has a transparent background
- **THEN** the generated thumbnail SHALL also maintain that transparency.
