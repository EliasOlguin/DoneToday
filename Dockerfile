FROM node:24-bookworm-slim AS frontend
WORKDIR /src/DoneToday.Web
COPY VERSION /src/VERSION
COPY DoneToday.Web/package*.json ./
RUN npm ci
COPY DoneToday.Web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0.402 AS backend
WORKDIR /src
COPY VERSION Directory.Build.props ./
COPY DoneToday/DoneToday.csproj DoneToday/
RUN dotnet restore DoneToday/DoneToday.csproj
COPY DoneToday/ DoneToday/
RUN dotnet publish DoneToday/DoneToday.csproj -c Release --no-restore -o /app/publish /p:UseAppHost=false
COPY --from=frontend /src/DoneToday.Web/dist /app/publish/wwwroot

FROM mcr.microsoft.com/dotnet/aspnet:10.0.13 AS final
WORKDIR /app
COPY --from=backend /app/publish ./
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTP_PORTS=8080
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "DoneToday.dll"]
