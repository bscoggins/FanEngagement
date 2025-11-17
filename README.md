# FanEngagement\\Runtime: .NET 9

# TODO: Add readme content for the application

an application that allows users to acquire "shares" of an actual entity, such as a football or soccer team. This should allow voting on the direction of the actual entity by the users/shareholders.

## Backend Architecture Overview

API: ASP.NET Core Web API (controllers or minimal APIs; we’ll structure so you can choose)

Data: PostgreSQL (via Docker Compose)

ORM: EF Core

Auth: JWT-based (stubbed initially; structure ready for real auth later)

Architecture style: layered / clean-ish:

FanEngagement.Api – HTTP endpoints, filters, DI wiring

FanEngagement.Application – use cases / services, DTOs, validation

FanEngagement.Domain – entities, value objects, domain services

FanEngagement.Infrastructure – EF Core DbContext, migrations, repositories

FanEngagement.Tests – unit + integration tests
